<?php

declare(strict_types=1);

use App\Enums\MenuBadge;
use App\Enums\ModifierSelectionType;
use App\Models\Category;
use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('non-admin roles are forbidden from admin catalog routes', function () {
    $kasir = User::factory()->kasir()->create();
    $barista = User::factory()->barista()->create();

    $this->actingAs($kasir)->get(route('admin.categories.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.menus.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.modifiers.index'))->assertForbidden();

    $this->actingAs($barista)->get(route('admin.categories.index'))->assertForbidden();
    $this->actingAs($barista)->get(route('admin.menus.index'))->assertForbidden();
});

test('admin can manage categories and is blocked from deleting category with menu items', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('admin.categories.index'))->assertOk();

    $this->actingAs($admin)->post(route('admin.categories.store'), [
        'name' => 'Manual Brew',
        'icon' => 'coffee',
        'sort_order' => 5,
        'is_active' => true,
    ])->assertRedirect();

    $category = Category::query()->where('name', 'Manual Brew')->firstOrFail();
    expect($category->slug)->toBe('manual-brew');

    $this->actingAs($admin)->put(route('admin.categories.update', $category), [
        'name' => 'Single Origin Brew',
        'icon' => 'sparkles',
        'sort_order' => 2,
        'is_active' => true,
    ])->assertRedirect();

    expect($category->fresh()?->slug)->toBe('single-origin-brew');

    MenuItem::factory()->create(['category_id' => $category->id]);

    $this->actingAs($admin)->delete(route('admin.categories.destroy', $category))
        ->assertRedirect()
        ->assertSessionHas('error');
    expect(Category::query()->find($category->id))->not->toBeNull();

    $emptyCategory = Category::factory()->create();
    $this->actingAs($admin)->delete(route('admin.categories.destroy', $emptyCategory))
        ->assertRedirect()
        ->assertSessionHas('success');
    expect(Category::query()->find($emptyCategory->id))->toBeNull();
});

test('admin can crud menu items, upload photo, toggle sold-out, and save BOM recipe', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $group = ModifierGroup::factory()->create();
    $beans = Ingredient::factory()->create(['name' => 'Espresso Beans', 'cost_per_unit' => 300]);
    $milk = Ingredient::factory()->create(['name' => 'Fresh Milk', 'cost_per_unit' => 25]);

    $this->actingAs($admin)->get(route('admin.menus.index'))->assertOk();

    $file = UploadedFile::fake()->create('v60-latte.png', 100, 'image/png');

    $this->actingAs($admin)->post(route('admin.menus.store'), [
        'category_id' => $category->id,
        'name' => 'Kopi Aren Spesial',
        'description' => 'Espresso dengan gula aren pilihan.',
        'price' => 30000,
        'badge' => MenuBadge::BestSeller->value,
        'is_available' => true,
        'is_active' => true,
        'sort_order' => 1,
        'image' => $file,
        'modifier_group_ids' => [$group->id],
    ])->assertRedirect();

    $menu = MenuItem::query()->where('name', 'Kopi Aren Spesial')->firstOrFail();
    expect($menu->image_path)->not->toBeNull()
        ->and($menu->modifierGroups)->toHaveCount(1);
    Storage::disk('public')->assertExists((string) $menu->image_path);

    // Toggle manual sold-out
    $this->actingAs($admin)
        ->patch(route('admin.menus.toggle-availability', $menu))
        ->assertRedirect();
    expect($menu->fresh()?->is_available)->toBeFalse();

    // Save BOM recipe
    $this->actingAs($admin)
        ->put(route('admin.menus.recipe.update', $menu), [
            'ingredients' => [
                ['ingredient_id' => $beans->id, 'quantity' => 18],
                ['ingredient_id' => $milk->id, 'quantity' => 150],
            ],
        ])
        ->assertRedirect();

    expect($menu->recipeItems()->count())->toBe(2);

    // Soft-delete menu
    $this->actingAs($admin)
        ->delete(route('admin.menus.destroy', $menu))
        ->assertRedirect();

    expect(MenuItem::query()->find($menu->id))->toBeNull()
        ->and(MenuItem::withTrashed()->find($menu->id))->not->toBeNull();
});

test('admin can manage modifier groups and single-choice default option exclusivity', function () {
    $admin = User::factory()->admin()->create();
    $ingredient = Ingredient::factory()->create();

    $this->actingAs($admin)->get(route('admin.modifiers.index'))->assertOk();

    $this->actingAs($admin)->post(route('admin.modifiers.store'), [
        'name' => 'Suhu Minuman',
        'selection_type' => ModifierSelectionType::Single->value,
        'is_required' => true,
        'min_select' => 1,
        'max_select' => 1,
        'sort_order' => 1,
    ])->assertRedirect();

    $group = ModifierGroup::query()->where('name', 'Suhu Minuman')->firstOrFail();

    $this->actingAs($admin)->post(route('admin.modifiers.options.store', $group), [
        'name' => 'Iced',
        'price_delta' => 0,
        'is_default' => true,
        'is_available' => true,
        'sort_order' => 1,
    ])->assertRedirect();

    $this->actingAs($admin)->post(route('admin.modifiers.options.store', $group), [
        'name' => 'Hot Oat',
        'price_delta' => 6000,
        'is_default' => true,
        'is_available' => true,
        'ingredient_id' => $ingredient->id,
        'ingredient_qty' => 150,
        'sort_order' => 2,
    ])->assertRedirect();

    $iced = ModifierOption::query()->where('modifier_group_id', $group->id)->where('name', 'Iced')->firstOrFail();
    $hotOat = ModifierOption::query()->where('modifier_group_id', $group->id)->where('name', 'Hot Oat')->firstOrFail();

    expect($iced->is_default)->toBeFalse()
        ->and($hotOat->is_default)->toBeTrue()
        ->and($hotOat->ingredient_id)->toBe($ingredient->id);
});
