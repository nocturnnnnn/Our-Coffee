<?php

declare(strict_types=1);

use App\Enums\StockMovementType;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Distributor;
use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\MenuAvailabilityService;

test('restock increases stock, updates unit cost, logs movement, and restores sold-out menu availability', function () {
    $admin = User::factory()->admin()->create();
    $distributor = Distributor::factory()->create();
    $ingredient = Ingredient::factory()->create([
        'current_stock' => '5.000',
        'cost_per_unit' => 200,
        'default_distributor_id' => $distributor->id,
    ]);

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'is_available' => true]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $ingredient->id,
        'quantity' => '18.000',
    ]);

    $availabilityService = app(MenuAvailabilityService::class);
    expect($availabilityService->isAvailable($menu))->toBeFalse();

    $inventoryService = app(InventoryService::class);
    $movement = $inventoryService->restock(
        ingredient: $ingredient,
        quantity: 1000.0,
        totalCost: 250000,
        distributorId: $distributor->id,
        actorId: $admin->id,
        notes: 'Pengiriman pagi',
    );

    $ingredient->refresh();

    expect((float) $ingredient->current_stock)->toBe(1005.0)
        ->and($ingredient->cost_per_unit)->toBe(250)
        ->and($movement->type)->toBe(StockMovementType::Restock)
        ->and($movement->total_cost)->toBe(250000)
        ->and($availabilityService->isAvailable($menu->fresh()))->toBeTrue();
});

test('waste and stock opname adjust stock and create audit logs', function () {
    $admin = User::factory()->admin()->create();
    $ingredient = Ingredient::factory()->create([
        'current_stock' => '500.000',
        'cost_per_unit' => 100,
    ]);

    $inventoryService = app(InventoryService::class);

    $wasteMovement = $inventoryService->recordWaste(
        ingredient: $ingredient,
        quantity: 50.0,
        reason: 'Susu tumpah saat steaming',
        actorId: $admin->id,
        authorizedById: $admin->id,
    );

    expect((float) $ingredient->refresh()->current_stock)->toBe(450.0)
        ->and($wasteMovement->type)->toBe(StockMovementType::Waste)
        ->and((float) $wasteMovement->quantity_change)->toBe(-50.0);

    $opnameMovement = $inventoryService->recordOpname(
        ingredient: $ingredient,
        actualStock: 420.0,
        reason: 'Penghitungan fisik akhir hari',
        actorId: $admin->id,
        authorizedById: $admin->id,
    );

    expect((float) $ingredient->refresh()->current_stock)->toBe(420.0)
        ->and($opnameMovement->type)->toBe(StockMovementType::Opname)
        ->and((float) $opnameMovement->quantity_change)->toBe(-30.0);

    expect(AuditLog::query()->where('action', 'stock.waste')->count())->toBe(1)
        ->and(AuditLog::query()->where('action', 'stock.opname')->count())->toBe(1);
});
