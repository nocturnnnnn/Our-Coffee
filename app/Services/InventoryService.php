<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\StockMovementType;
use App\Exceptions\StockConflictException;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryService
{
    public function __construct(
        private readonly AuditLogService $auditLogService,
    ) {}

    public function restock(
        Ingredient $ingredient,
        float $quantity,
        int $totalCost,
        ?int $distributorId = null,
        ?int $actorId = null,
        ?string $notes = null,
    ): StockMovement {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Jumlah restock harus lebih dari 0.');
        }

        return DB::transaction(function () use ($ingredient, $quantity, $totalCost, $distributorId, $actorId, $notes): StockMovement {
            $locked = Ingredient::query()->whereKey($ingredient->id)->lockForUpdate()->firstOrFail();

            $before = (float) $locked->current_stock;
            $after = $before + $quantity;
            $unitCost = $totalCost > 0 ? (int) round($totalCost / $quantity) : $locked->cost_per_unit;

            $locked->forceFill([
                'current_stock' => $this->formatDecimal($after),
                'cost_per_unit' => $unitCost,
            ])->save();

            return StockMovement::query()->create([
                'ingredient_id' => $locked->id,
                'type' => StockMovementType::Restock,
                'quantity_change' => $this->formatDecimal($quantity),
                'stock_before' => $this->formatDecimal($before),
                'stock_after' => $this->formatDecimal($after),
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'distributor_id' => $distributorId ?? $locked->default_distributor_id,
                'notes' => $notes,
                'created_by' => $actorId,
                'created_at' => now('Asia/Jakarta'),
            ]);
        });
    }

    public function recordWaste(
        Ingredient $ingredient,
        float $quantity,
        string $reason,
        ?int $actorId = null,
        ?int $authorizedById = null,
    ): StockMovement {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Jumlah waste harus lebih dari 0.');
        }

        return DB::transaction(function () use ($ingredient, $quantity, $reason, $actorId, $authorizedById): StockMovement {
            $locked = Ingredient::query()->whereKey($ingredient->id)->lockForUpdate()->firstOrFail();

            $before = (float) $locked->current_stock;
            $after = max(0.0, $before - $quantity);
            $actualDelta = $after - $before;

            $locked->forceFill([
                'current_stock' => $this->formatDecimal($after),
            ])->save();

            $movement = StockMovement::query()->create([
                'ingredient_id' => $locked->id,
                'type' => StockMovementType::Waste,
                'quantity_change' => $this->formatDecimal($actualDelta),
                'stock_before' => $this->formatDecimal($before),
                'stock_after' => $this->formatDecimal($after),
                'unit_cost' => $locked->cost_per_unit,
                'total_cost' => (int) round(abs($actualDelta) * $locked->cost_per_unit),
                'notes' => $reason,
                'created_by' => $actorId,
                'created_at' => now('Asia/Jakarta'),
            ]);

            $this->auditLogService->record(
                action: 'stock.waste',
                actorId: $actorId,
                authorizedById: $authorizedById,
                auditable: $locked,
                reason: $reason,
                metadata: [
                    'ingredient_name' => $locked->name,
                    'stock_before' => $this->formatDecimal($before),
                    'stock_after' => $this->formatDecimal($after),
                    'delta' => $this->formatDecimal($actualDelta),
                ],
            );

            return $movement;
        });
    }

    public function recordOpname(
        Ingredient $ingredient,
        float $actualStock,
        string $reason,
        ?int $actorId = null,
        ?int $authorizedById = null,
    ): StockMovement {
        if ($actualStock < 0) {
            throw new InvalidArgumentException('Stok aktual opname tidak boleh negatif.');
        }

        return DB::transaction(function () use ($ingredient, $actualStock, $reason, $actorId, $authorizedById): StockMovement {
            $locked = Ingredient::query()->whereKey($ingredient->id)->lockForUpdate()->firstOrFail();

            $before = (float) $locked->current_stock;
            $delta = $actualStock - $before;

            $locked->forceFill([
                'current_stock' => $this->formatDecimal($actualStock),
            ])->save();

            $movement = StockMovement::query()->create([
                'ingredient_id' => $locked->id,
                'type' => StockMovementType::Opname,
                'quantity_change' => $this->formatDecimal($delta),
                'stock_before' => $this->formatDecimal($before),
                'stock_after' => $this->formatDecimal($actualStock),
                'unit_cost' => $locked->cost_per_unit,
                'total_cost' => (int) round(abs($delta) * $locked->cost_per_unit),
                'notes' => $reason,
                'created_by' => $actorId,
                'created_at' => now('Asia/Jakarta'),
            ]);

            $this->auditLogService->record(
                action: 'stock.opname',
                actorId: $actorId,
                authorizedById: $authorizedById,
                auditable: $locked,
                reason: $reason,
                metadata: [
                    'ingredient_name' => $locked->name,
                    'stock_before' => $this->formatDecimal($before),
                    'stock_after' => $this->formatDecimal($actualStock),
                    'delta' => $this->formatDecimal($delta),
                ],
            );

            return $movement;
        });
    }

    /**
     * Atomically deduct BOM and modifier option ingredients for a paid order.
     */
    public function deductForOrder(Order $order, ?int $actorId = null): void
    {
        $order->loadMissing([
            'items.menuItem.recipeItems',
            'items.modifiers.modifierOption',
        ]);

        /** @var array<int, float> $usageByIngredient */
        $usageByIngredient = [];

        /** @var array<int, array<int, int>> $ingredientToMenuIds */
        $ingredientToMenuIds = [];

        /** @var array<int, string> $menuNames */
        $menuNames = [];

        foreach ($order->items as $orderItem) {
            $menuNames[$orderItem->menu_item_id] = $orderItem->menu_item_name;

            if ($orderItem->menuItem !== null) {
                foreach ($orderItem->menuItem->recipeItems as $recipeItem) {
                    $needed = (float) $recipeItem->quantity * $orderItem->quantity;
                    if ($needed <= 0) {
                        continue;
                    }

                    $usageByIngredient[$recipeItem->ingredient_id] = ($usageByIngredient[$recipeItem->ingredient_id] ?? 0.0) + $needed;
                    $ingredientToMenuIds[$recipeItem->ingredient_id][] = $orderItem->menu_item_id;
                }
            }

            foreach ($orderItem->modifiers as $itemModifier) {
                $option = $itemModifier->modifierOption;
                if ($option !== null && $option->ingredient_id !== null && (float) $option->ingredient_qty > 0) {
                    $needed = (float) $option->ingredient_qty * $orderItem->quantity;
                    $usageByIngredient[$option->ingredient_id] = ($usageByIngredient[$option->ingredient_id] ?? 0.0) + $needed;
                    $ingredientToMenuIds[$option->ingredient_id][] = $orderItem->menu_item_id;
                }
            }
        }

        if ($usageByIngredient === []) {
            return;
        }

        DB::transaction(function () use ($order, $usageByIngredient, $ingredientToMenuIds, $menuNames, $actorId): void {
            $ingredientIds = array_keys($usageByIngredient);
            sort($ingredientIds);

            $lockedIngredients = Ingredient::query()
                ->whereIn('id', $ingredientIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $conflicts = [];
            foreach ($ingredientIds as $ingredientId) {
                $ingredient = $lockedIngredients->get($ingredientId);
                $needed = $usageByIngredient[$ingredientId];

                if ($ingredient === null || ! $ingredient->is_active || (float) $ingredient->current_stock + 1e-9 < $needed) {
                    foreach (array_unique($ingredientToMenuIds[$ingredientId] ?? []) as $menuId) {
                        $conflicts[] = [
                            'menu_item_id' => $menuId,
                            'menu_item_name' => $menuNames[$menuId] ?? "Menu #{$menuId}",
                            'reason' => sprintf(
                                'Stok bahan "%s" tidak mencukupi saat pelunasan',
                                $ingredient->name ?? "#{$ingredientId}",
                            ),
                        ];
                    }
                }
            }

            if ($conflicts !== []) {
                throw new StockConflictException($conflicts);
            }

            $now = now('Asia/Jakarta');

            foreach ($ingredientIds as $ingredientId) {
                $ingredient = $lockedIngredients->get($ingredientId);
                if ($ingredient === null) {
                    continue;
                }

                $needed = $usageByIngredient[$ingredientId];
                $before = (float) $ingredient->current_stock;
                $after = max(0.0, $before - $needed);

                $ingredient->forceFill([
                    'current_stock' => $this->formatDecimal($after),
                ])->save();

                StockMovement::query()->create([
                    'ingredient_id' => $ingredient->id,
                    'type' => StockMovementType::Sale,
                    'quantity_change' => $this->formatDecimal(-$needed),
                    'stock_before' => $this->formatDecimal($before),
                    'stock_after' => $this->formatDecimal($after),
                    'unit_cost' => $ingredient->cost_per_unit,
                    'total_cost' => (int) round($needed * $ingredient->cost_per_unit),
                    'reference_type' => Order::class,
                    'reference_id' => $order->id,
                    'notes' => 'Pemotongan stok otomatis '.$order->order_number,
                    'created_by' => $actorId,
                    'created_at' => $now,
                ]);
            }
        });
    }

    private function formatDecimal(float $value): string
    {
        return number_format($value, 3, '.', '');
    }
}
