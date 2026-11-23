<?php

declare(strict_types=1);

use App\Enums\IngredientUnit;
use App\Enums\StockMovementType;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Distributor;
use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\MenuAvailabilityService;

test('non-admin roles cannot access distributor or inventory routes', function () {
    $kasir = User::factory()->kasir()->create();
    $barista = User::factory()->barista()->create();

    $this->actingAs($kasir)->get(route('admin.distributors.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.inventory.index'))->assertForbidden();
    $this->actingAs($barista)->get(route('admin.inventory.index'))->assertForbidden();
});

test('admin can crud distributors', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('admin.distributors.index'))->assertOk();

    $this->actingAs($admin)->post(route('admin.distributors.store'), [
        'name' => 'Kopi Gayo Mandiri',
        'contact_person' => 'Andi',
        'phone' => '08123456789',
        'email' => 'sales@gayomandiri.id',
        'address' => 'Jakarta Barat',
        'is_active' => true,
    ])->assertRedirect();

    $dist = Distributor::query()->where('name', 'Kopi Gayo Mandiri')->firstOrFail();

    $this->actingAs($admin)->put(route('admin.distributors.update', $dist), [
        'name' => 'PT Kopi Gayo Mandiri',
        'contact_person' => 'Andi Wijaya',
        'phone' => '08123456789',
        'email' => 'sales@gayomandiri.id',
        'address' => 'Jakarta Selatan',
        'is_active' => true,
    ])->assertRedirect();

    expect($dist->fresh()?->name)->toBe('PT Kopi Gayo Mandiri');

    $this->actingAs($admin)->delete(route('admin.distributors.destroy', $dist))
        ->assertRedirect();

    expect(Distributor::query()->find($dist->id))->toBeNull();
});

test('admin can create ingredient, perform stock in restoring sold-out menu, waste, and opname', function () {
    $admin = User::factory()->admin()->create();
    $distributor = Distributor::factory()->create();

    $this->actingAs($admin)->get(route('admin.inventory.index'))->assertOk();

    $this->actingAs($admin)->post(route('admin.inventory.ingredients.store'), [
        'name' => 'House Blend Beans',
        'sku' => 'HB-001',
        'unit' => IngredientUnit::Gram->value,
        'current_stock' => 0,
        'min_stock' => 500,
        'cost_per_unit' => 250,
        'default_distributor_id' => $distributor->id,
        'is_active' => true,
    ])->assertRedirect();

    $ingredient = Ingredient::query()->where('sku', 'HB-001')->firstOrFail();

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'is_available' => true]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $ingredient->id,
        'quantity' => '18.000',
    ]);

    $availabilityService = app(MenuAvailabilityService::class);
    expect($availabilityService->isAvailable($menu))->toBeFalse();

    // Stock In 1000g @ Rp 300.000 => cost_per_unit becomes 300 and menu becomes available
    $this->actingAs($admin)->post(route('admin.inventory.ingredients.restock', $ingredient), [
        'quantity' => 1000,
        'total_cost' => 300000,
        'distributor_id' => $distributor->id,
        'notes' => 'Invoice #INV-101',
    ])->assertRedirect();

    $ingredient->refresh();
    expect((float) $ingredient->current_stock)->toBe(1000.0)
        ->and($ingredient->cost_per_unit)->toBe(300)
        ->and($availabilityService->isAvailable($menu->fresh()))->toBeTrue();

    // Record Waste 100g
    $this->actingAs($admin)->post(route('admin.inventory.ingredients.waste', $ingredient), [
        'quantity' => 100,
        'reason' => 'Terbakar saat kalibrasi grinder',
    ])->assertRedirect();

    expect((float) $ingredient->refresh()->current_stock)->toBe(900.0);

    // Record Opname 880g
    $this->actingAs($admin)->post(route('admin.inventory.ingredients.opname', $ingredient), [
        'actual_stock' => 880,
        'reason' => 'Stock opname sore',
    ])->assertRedirect();

    expect((float) $ingredient->refresh()->current_stock)->toBe(880.0)
        ->and(StockMovement::query()->where('ingredient_id', $ingredient->id)->where('type', StockMovementType::Restock->value)->count())->toBe(1)
        ->and(StockMovement::query()->where('ingredient_id', $ingredient->id)->where('type', StockMovementType::Waste->value)->count())->toBe(1)
        ->and(StockMovement::query()->where('ingredient_id', $ingredient->id)->where('type', StockMovementType::Opname->value)->count())->toBe(1)
        ->and(AuditLog::query()->where('action', 'stock.waste')->count())->toBe(1)
        ->and(AuditLog::query()->where('action', 'stock.opname')->count())->toBe(1);
});
