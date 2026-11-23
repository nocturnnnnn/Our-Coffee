<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\ModifierOption;
use Illuminate\Database\Eloquent\Collection;

class MenuAvailabilityService
{
    public function isAvailable(MenuItem $menuItem, int $quantity = 1): bool
    {
        if (! $menuItem->is_active || ! $menuItem->is_available) {
            return false;
        }

        $menuItem->loadMissing('recipeItems.ingredient');

        foreach ($menuItem->recipeItems as $recipeItem) {
            $required = (float) $recipeItem->quantity * max(1, $quantity);
            $ingredient = $recipeItem->ingredient;

            if (! $ingredient->is_active || (float) $ingredient->current_stock < $required) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluate availability and maximum servings for a collection of menu items without N+1 queries.
     *
     * @param  Collection<int, MenuItem>  $menuItems
     * @return array<int, array{is_available: bool, reason: ?string, max_servings: ?int}>
     */
    public function getAvailabilityMap(Collection $menuItems): array
    {
        $menuItems->loadMissing('recipeItems.ingredient');

        $result = [];

        foreach ($menuItems as $menuItem) {
            if (! $menuItem->is_active) {
                $result[$menuItem->id] = [
                    'is_available' => false,
                    'reason' => 'Menu tidak aktif',
                    'max_servings' => 0,
                ];

                continue;
            }

            if (! $menuItem->is_available) {
                $result[$menuItem->id] = [
                    'is_available' => false,
                    'reason' => 'Ditandai habis secara manual',
                    'max_servings' => 0,
                ];

                continue;
            }

            if ($menuItem->recipeItems->isEmpty()) {
                $result[$menuItem->id] = [
                    'is_available' => true,
                    'reason' => null,
                    'max_servings' => null,
                ];

                continue;
            }

            $maxServings = null;
            $shortageReason = null;

            foreach ($menuItem->recipeItems as $recipeItem) {
                $qty = (float) $recipeItem->quantity;
                if ($qty <= 0) {
                    continue;
                }

                $ingredient = $recipeItem->ingredient;
                if (! $ingredient->is_active) {
                    $maxServings = 0;
                    $shortageReason = sprintf('Bahan %s tidak aktif', $ingredient->name);
                    break;
                }

                $possible = (int) floor((float) $ingredient->current_stock / $qty);
                if ($possible <= 0) {
                    $maxServings = 0;
                    $shortageReason = sprintf('Stok %s habis', $ingredient->name);
                    break;
                }

                $maxServings = $maxServings === null ? $possible : min($maxServings, $possible);
            }

            $result[$menuItem->id] = [
                'is_available' => $shortageReason === null && ($maxServings === null || $maxServings > 0),
                'reason' => $shortageReason,
                'max_servings' => $maxServings,
            ];
        }

        return $result;
    }

    /**
     * Validate cumulative cart demand (including modifier ingredients) against current stock.
     *
     * @param  array<int, array{menu_item_id: int, quantity: int, modifier_option_ids?: array<int, int>}>  $cartItems
     * @return array<int, array{menu_item_id: int, menu_item_name: string, reason: string}>
     */
    public function findUnavailableCartItems(array $cartItems): array
    {
        if ($cartItems === []) {
            return [];
        }

        $menuIds = array_values(array_unique(array_column($cartItems, 'menu_item_id')));
        $menus = MenuItem::query()
            ->with('recipeItems.ingredient')
            ->whereIn('id', $menuIds)
            ->get()
            ->keyBy('id');

        $allModifierIds = [];
        foreach ($cartItems as $item) {
            foreach ($item['modifier_option_ids'] ?? [] as $optionId) {
                $allModifierIds[] = $optionId;
            }
        }
        $modifierOptions = $allModifierIds !== []
            ? ModifierOption::query()->with('ingredient')->whereIn('id', array_unique($allModifierIds))->get()->keyBy('id')
            : collect();

        /** @var array<int, float> $remainingStock */
        $remainingStock = [];
        $conflicts = [];

        foreach ($cartItems as $item) {
            $menuId = $item['menu_item_id'];
            $qty = max(1, $item['quantity']);
            $menu = $menus->get($menuId);

            if ($menu === null || ! $menu->is_active || ! $menu->is_available) {
                $conflicts[] = [
                    'menu_item_id' => $menuId,
                    'menu_item_name' => $menu->name ?? "Menu #{$menuId}",
                    'reason' => 'Menu sedang tidak tersedia / habis',
                ];

                continue;
            }

            /** @var array<int, float> $itemDemand */
            $itemDemand = [];
            foreach ($menu->recipeItems as $recipeItem) {
                $ing = $recipeItem->ingredient;
                $remainingStock[$ing->id] ??= $ing->is_active ? (float) $ing->current_stock : 0.0;
                $itemDemand[$ing->id] = ($itemDemand[$ing->id] ?? 0.0) + ((float) $recipeItem->quantity * $qty);
            }

            foreach ($item['modifier_option_ids'] ?? [] as $optionId) {
                $option = $modifierOptions->get($optionId);
                if ($option === null || ! $option->is_available) {
                    $conflicts[] = [
                        'menu_item_id' => $menuId,
                        'menu_item_name' => $menu->name,
                        'reason' => sprintf('Modifier "%s" tidak tersedia', $option->name ?? "#{$optionId}"),
                    ];

                    continue 2;
                }

                if ($option->ingredient_id !== null && (float) $option->ingredient_qty > 0 && $option->ingredient !== null) {
                    $ing = $option->ingredient;
                    $remainingStock[$ing->id] ??= $ing->is_active ? (float) $ing->current_stock : 0.0;
                    $itemDemand[$ing->id] = ($itemDemand[$ing->id] ?? 0.0) + ((float) $option->ingredient_qty * $qty);
                }
            }

            $shortageIngredient = null;
            foreach ($itemDemand as $ingredientId => $needed) {
                if (($remainingStock[$ingredientId] ?? 0.0) + 1e-9 < $needed) {
                    $foundIngredient = Ingredient::query()->find($ingredientId);
                    $shortageIngredient = $foundIngredient !== null ? $foundIngredient->name : "#{$ingredientId}";
                    break;
                }
            }

            if ($shortageIngredient !== null) {
                $conflicts[] = [
                    'menu_item_id' => $menuId,
                    'menu_item_name' => $menu->name,
                    'reason' => sprintf('Stok bahan "%s" tidak mencukupi', $shortageIngredient),
                ];

                continue;
            }

            foreach ($itemDemand as $ingredientId => $needed) {
                $remainingStock[$ingredientId] -= $needed;
            }
        }

        return $conflicts;
    }
}
