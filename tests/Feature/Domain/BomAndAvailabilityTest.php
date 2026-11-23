<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Services\BomCostService;
use App\Services\MenuAvailabilityService;
use Illuminate\Database\Eloquent\Collection;

test('calculates BOM COGS, gross margin, and unsaved recipe preview accurately', function () {
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create(['cost_per_unit' => 300]);
    $milk = Ingredient::factory()->create(['cost_per_unit' => 25]);
    $oatMilk = Ingredient::factory()->create(['cost_per_unit' => 50]);

    $menu = MenuItem::factory()->create([
        'category_id' => $category->id,
        'price' => 30000,
    ]);

    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $milk->id,
        'quantity' => '150.000',
    ]);

    $group = ModifierGroup::factory()->create();
    $oatOption = ModifierOption::factory()->create([
        'modifier_group_id' => $group->id,
        'name' => 'Oat Milk',
        'price_delta' => 8000,
        'ingredient_id' => $oatMilk->id,
        'ingredient_qty' => '150.000',
    ]);

    $bomService = app(BomCostService::class);

    // Base COGS: (18 * 300) + (150 * 25) = 5400 + 3750 = 9150
    expect($bomService->calculateCogs($menu))->toBe(9150);

    // With Oat Milk option: 9150 + (150 * 50) = 16650
    expect($bomService->calculateCogs($menu, [$oatOption->id]))->toBe(16650);

    $margin = $bomService->calculateGrossMargin(30000, 9150);
    expect($margin)->toBe([
        'cogs' => 9150,
        'gross_profit' => 20850,
        'gross_margin_percent' => 69.5,
    ]);

    $preview = $bomService->previewRecipeCost(30000, [
        ['ingredient_id' => $beans->id, 'quantity' => 20],
        ['ingredient_id' => $milk->id, 'quantity' => 100],
    ]);
    expect($preview['cogs'])->toBe(8500)
        ->and($preview['gross_profit'])->toBe(21500);
});

test('evaluates menu availability map and cumulative cart conflicts', function () {
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create([
        'name' => 'Espresso Beans',
        'current_stock' => '40.000',
        'min_stock' => '10.000',
    ]);
    $milk = Ingredient::factory()->create([
        'name' => 'Fresh Milk',
        'current_stock' => '0.000',
        'min_stock' => '100.000',
    ]);

    $americano = MenuItem::factory()->create([
        'category_id' => $category->id,
        'name' => 'Americano',
        'is_available' => true,
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $americano->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $latte = MenuItem::factory()->create([
        'category_id' => $category->id,
        'name' => 'Caffe Latte',
        'is_available' => true,
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $latte->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $latte->id,
        'ingredient_id' => $milk->id,
        'quantity' => '150.000',
    ]);

    $manualSoldOut = MenuItem::factory()->create([
        'category_id' => $category->id,
        'name' => 'Manual Sold Out',
        'is_available' => false,
    ]);

    $service = app(MenuAvailabilityService::class);
    $map = $service->getAvailabilityMap(new Collection([$americano, $latte, $manualSoldOut]));

    expect($map[$americano->id]['is_available'])->toBeTrue()
        ->and($map[$americano->id]['max_servings'])->toBe(2)
        ->and($map[$latte->id]['is_available'])->toBeFalse()
        ->and($map[$latte->id]['reason'])->toContain('Fresh Milk')
        ->and($map[$manualSoldOut->id]['is_available'])->toBeFalse();

    // Cumulative cart demand: 2 Americanos ok (36g <= 40g), 3rd fails (54g > 40g)
    expect($service->findUnavailableCartItems([
        ['menu_item_id' => $americano->id, 'quantity' => 2],
    ]))->toBeEmpty();

    $conflicts = $service->findUnavailableCartItems([
        ['menu_item_id' => $americano->id, 'quantity' => 3],
    ]);
    expect($conflicts)->toHaveCount(1)
        ->and($conflicts[0]['menu_item_id'])->toBe($americano->id);
});
