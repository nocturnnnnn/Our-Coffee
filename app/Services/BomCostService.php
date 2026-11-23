<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\ModifierOption;

class BomCostService
{
    /**
     * Calculate integer Rupiah COGS for a menu item and optional selected modifiers.
     *
     * @param  array<int, int>  $modifierOptionIds
     */
    public function calculateCogs(MenuItem $menuItem, array $modifierOptionIds = []): int
    {
        $menuItem->loadMissing('recipeItems.ingredient');

        $totalCost = 0.0;
        foreach ($menuItem->recipeItems as $recipeItem) {
            $ingredient = $recipeItem->ingredient;
            $totalCost += (float) $recipeItem->quantity * $ingredient->cost_per_unit;
        }

        if ($modifierOptionIds !== []) {
            $options = ModifierOption::query()
                ->with('ingredient')
                ->whereIn('id', $modifierOptionIds)
                ->whereNotNull('ingredient_id')
                ->whereNotNull('ingredient_qty')
                ->get();

            foreach ($options as $option) {
                if ($option->ingredient !== null && (float) $option->ingredient_qty > 0) {
                    $totalCost += (float) $option->ingredient_qty * $option->ingredient->cost_per_unit;
                }
            }
        }

        return (int) round($totalCost);
    }

    /**
     * Calculate gross profit and gross margin percentage from integer Rupiah selling price and COGS.
     *
     * @return array{cogs: int, gross_profit: int, gross_margin_percent: float}
     */
    public function calculateGrossMargin(int $sellingPrice, int $cogs): array
    {
        $grossProfit = $sellingPrice - $cogs;
        $marginPercent = $sellingPrice > 0
            ? round(($grossProfit / $sellingPrice) * 100, 1)
            : 0.0;

        return [
            'cogs' => $cogs,
            'gross_profit' => $grossProfit,
            'gross_margin_percent' => $marginPercent,
        ];
    }

    /**
     * Preview COGS and gross margin for unsaved BOM recipe rows in the admin editor.
     *
     * @param  array<int, array{ingredient_id: int, quantity: float|int|string}>  $recipeRows
     * @return array{cogs: int, gross_profit: int, gross_margin_percent: float}
     */
    public function previewRecipeCost(int $sellingPrice, array $recipeRows): array
    {
        if ($recipeRows === []) {
            return $this->calculateGrossMargin($sellingPrice, 0);
        }

        $ingredientIds = array_values(array_unique(array_column($recipeRows, 'ingredient_id')));
        $ingredients = Ingredient::query()
            ->whereIn('id', $ingredientIds)
            ->get()
            ->keyBy('id');

        $totalCost = 0.0;
        foreach ($recipeRows as $row) {
            $ingredient = $ingredients->get($row['ingredient_id']);
            if ($ingredient === null) {
                continue;
            }

            $qty = (float) $row['quantity'];
            if ($qty > 0) {
                $totalCost += $qty * $ingredient->cost_per_unit;
            }
        }

        return $this->calculateGrossMargin($sellingPrice, (int) round($totalCost));
    }
}
