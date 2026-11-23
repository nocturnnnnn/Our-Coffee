<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\IngredientUnit;
use App\Enums\MenuBadge;
use App\Enums\ModifierSelectionType;
use App\Enums\StockMovementType;
use App\Models\Category;
use App\Models\Distributor;
use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Seeder;

class CatalogAndInventorySeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::query()->where('email', 'admin@ourcoffee.test')->value('id');

        $distributors = $this->seedDistributors();
        $ingredients = $this->seedIngredients($distributors, $adminId);
        $categories = $this->seedCategories();
        $modifierGroups = $this->seedModifiers($ingredients);
        $this->seedMenusAndBom($categories, $ingredients, $modifierGroups);
    }

    /**
     * @return array<string, Distributor>
     */
    private function seedDistributors(): array
    {
        $data = [
            'roastery' => [
                'name' => 'Nusantara Roastery Co.',
                'contact_person' => 'Budi Santoso',
                'phone' => '0812-3456-7890',
                'email' => 'order@nusantararoastery.id',
                'address' => 'Jl. Kemang Timur No. 45, Jakarta Selatan',
            ],
            'dairy' => [
                'name' => 'Greenfields & Dairy Supply',
                'contact_person' => 'Siti Rahma',
                'phone' => '0813-9876-5432',
                'email' => 'supply@dairysupply.id',
                'address' => 'Kawasan Industri Pulogadung Blok B4, Jakarta Timur',
            ],
            'bakery' => [
                'name' => 'Artisan Bakehouse Jakarta',
                'contact_person' => 'Rizky Pratama',
                'phone' => '0811-2233-4455',
                'email' => 'hello@artisanbake.id',
                'address' => 'Jl. Senopati No. 88, Jakarta Selatan',
            ],
        ];

        $result = [];
        foreach ($data as $key => $attrs) {
            $result[$key] = Distributor::query()->updateOrCreate(
                ['name' => $attrs['name']],
                [...$attrs, 'is_active' => true],
            );
        }

        return $result;
    }

    /**
     * @param  array<string, Distributor>  $distributors
     * @return array<string, Ingredient>
     */
    private function seedIngredients(array $distributors, ?int $adminId): array
    {
        $items = [
            'espresso_beans' => [
                'name' => 'Arabica Espresso Beans',
                'sku' => 'ING-COF-001',
                'unit' => IngredientUnit::Gram,
                'current_stock' => '5000.000',
                'min_stock' => '1000.000',
                'cost_per_unit' => 280,
                'distributor' => 'roastery',
            ],
            'fresh_milk' => [
                'name' => 'Fresh Milk Full Cream',
                'sku' => 'ING-DRY-001',
                'unit' => IngredientUnit::Milliliter,
                'current_stock' => '12000.000',
                'min_stock' => '3000.000',
                'cost_per_unit' => 24,
                'distributor' => 'dairy',
            ],
            'oat_milk' => [
                'name' => 'Oat Milk Barista',
                'sku' => 'ING-DRY-002',
                'unit' => IngredientUnit::Milliliter,
                'current_stock' => '6000.000',
                'min_stock' => '1500.000',
                'cost_per_unit' => 45,
                'distributor' => 'dairy',
            ],
            'almond_milk' => [
                'name' => 'Almond Milk Unsweetened',
                'sku' => 'ING-DRY-003',
                'unit' => IngredientUnit::Milliliter,
                'current_stock' => '4000.000',
                'min_stock' => '1000.000',
                'cost_per_unit' => 48,
                'distributor' => 'dairy',
            ],
            'aren_syrup' => [
                'name' => 'Gula Aren Organik Cair',
                'sku' => 'ING-SYR-001',
                'unit' => IngredientUnit::Milliliter,
                'current_stock' => '3500.000',
                'min_stock' => '750.000',
                'cost_per_unit' => 40,
                'distributor' => 'roastery',
            ],
            'caramel_syrup' => [
                'name' => 'Salted Caramel Syrup',
                'sku' => 'ING-SYR-002',
                'unit' => IngredientUnit::Milliliter,
                'current_stock' => '2500.000',
                'min_stock' => '500.000',
                'cost_per_unit' => 85,
                'distributor' => 'roastery',
            ],
            'vanilla_syrup' => [
                'name' => 'Vanilla Bean Syrup',
                'sku' => 'ING-SYR-003',
                'unit' => IngredientUnit::Milliliter,
                'current_stock' => '2500.000',
                'min_stock' => '500.000',
                'cost_per_unit' => 80,
                'distributor' => 'roastery',
            ],
            'matcha_powder' => [
                'name' => 'Uji Matcha Ceremonial',
                'sku' => 'ING-TEA-001',
                'unit' => IngredientUnit::Gram,
                'current_stock' => '1000.000',
                'min_stock' => '200.000',
                'cost_per_unit' => 650,
                'distributor' => 'roastery',
            ],
            'chocolate_powder' => [
                'name' => 'Belgian Dark Chocolate',
                'sku' => 'ING-COC-001',
                'unit' => IngredientUnit::Gram,
                'current_stock' => '2000.000',
                'min_stock' => '400.000',
                'cost_per_unit' => 180,
                'distributor' => 'roastery',
            ],
            'croissant_butter' => [
                'name' => 'Butter Croissant Frozen',
                'sku' => 'ING-BKR-001',
                'unit' => IngredientUnit::Pieces,
                'current_stock' => '36.000',
                'min_stock' => '8.000',
                'cost_per_unit' => 11500,
                'distributor' => 'bakery',
            ],
            'pain_au_chocolat' => [
                'name' => 'Pain au Chocolat',
                'sku' => 'ING-BKR-002',
                'unit' => IngredientUnit::Pieces,
                'current_stock' => '24.000',
                'min_stock' => '6.000',
                'cost_per_unit' => 13000,
                'distributor' => 'bakery',
            ],
            'cup_lid' => [
                'name' => 'Cup & Lid 12oz',
                'sku' => 'ING-PKG-001',
                'unit' => IngredientUnit::Pieces,
                'current_stock' => '500.000',
                'min_stock' => '100.000',
                'cost_per_unit' => 950,
                'distributor' => 'dairy',
            ],
        ];

        $result = [];
        foreach ($items as $key => $item) {
            $distributor = $distributors[$item['distributor']];
            $ingredient = Ingredient::query()->updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'name' => $item['name'],
                    'unit' => $item['unit'],
                    'current_stock' => $item['current_stock'],
                    'min_stock' => $item['min_stock'],
                    'cost_per_unit' => $item['cost_per_unit'],
                    'default_distributor_id' => $distributor->id,
                    'is_active' => true,
                ],
            );

            if (! StockMovement::query()->where('ingredient_id', $ingredient->id)->exists()) {
                $qty = (float) $item['current_stock'];
                StockMovement::query()->create([
                    'ingredient_id' => $ingredient->id,
                    'type' => StockMovementType::Restock,
                    'quantity_change' => $item['current_stock'],
                    'stock_before' => '0.000',
                    'stock_after' => $item['current_stock'],
                    'unit_cost' => $item['cost_per_unit'],
                    'total_cost' => (int) round($qty * $item['cost_per_unit']),
                    'distributor_id' => $distributor->id,
                    'notes' => 'Stok awal kafe',
                    'created_by' => $adminId,
                    'created_at' => now(),
                ]);
            }

            $result[$key] = $ingredient;
        }

        return $result;
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        $categories = [
            'signature' => ['name' => 'Signature Coffee', 'slug' => 'signature-coffee', 'icon' => 'sparkles', 'sort_order' => 1],
            'espresso' => ['name' => 'Espresso Based', 'slug' => 'espresso-based', 'icon' => 'coffee', 'sort_order' => 2],
            'non_coffee' => ['name' => 'Non-Coffee', 'slug' => 'non-coffee', 'icon' => 'cup-soda', 'sort_order' => 3],
            'pastry' => ['name' => 'Pastry & Bites', 'slug' => 'pastry-bites', 'icon' => 'croissant', 'sort_order' => 4],
        ];

        $result = [];
        foreach ($categories as $key => $attrs) {
            $result[$key] = Category::query()->updateOrCreate(
                ['slug' => $attrs['slug']],
                [...$attrs, 'is_active' => true],
            );
        }

        return $result;
    }

    /**
     * @param  array<string, Ingredient>  $ingredients
     * @return array<string, ModifierGroup>
     */
    private function seedModifiers(array $ingredients): array
    {
        $temp = ModifierGroup::query()->updateOrCreate(
            ['name' => 'Suhu'],
            [
                'selection_type' => ModifierSelectionType::Single,
                'is_required' => true,
                'min_select' => 1,
                'max_select' => 1,
                'sort_order' => 1,
            ],
        );
        $this->syncModifierOptions($temp, [
            ['name' => 'Iced', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1],
            ['name' => 'Hot', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2],
        ]);

        $sugar = ModifierGroup::query()->updateOrCreate(
            ['name' => 'Level Gula'],
            [
                'selection_type' => ModifierSelectionType::Single,
                'is_required' => true,
                'min_select' => 1,
                'max_select' => 1,
                'sort_order' => 2,
            ],
        );
        $this->syncModifierOptions($sugar, [
            ['name' => 'Normal (100%)', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1],
            ['name' => 'Less Sugar (50%)', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2],
            ['name' => 'No Sugar (0%)', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 3],
        ]);

        $milk = ModifierGroup::query()->updateOrCreate(
            ['name' => 'Jenis Susu'],
            [
                'selection_type' => ModifierSelectionType::Single,
                'is_required' => false,
                'min_select' => 0,
                'max_select' => 1,
                'sort_order' => 3,
            ],
        );
        $this->syncModifierOptions($milk, [
            ['name' => 'Fresh Milk', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1],
            [
                'name' => 'Oat Milk',
                'price_delta' => 8000,
                'is_default' => false,
                'ingredient_id' => $ingredients['oat_milk']->id,
                'ingredient_qty' => '150.000',
                'sort_order' => 2,
            ],
            [
                'name' => 'Almond Milk',
                'price_delta' => 8000,
                'is_default' => false,
                'ingredient_id' => $ingredients['almond_milk']->id,
                'ingredient_qty' => '150.000',
                'sort_order' => 3,
            ],
        ]);

        $addons = ModifierGroup::query()->updateOrCreate(
            ['name' => 'Tambahan'],
            [
                'selection_type' => ModifierSelectionType::Multiple,
                'is_required' => false,
                'min_select' => 0,
                'max_select' => 3,
                'sort_order' => 4,
            ],
        );
        $this->syncModifierOptions($addons, [
            [
                'name' => 'Extra Espresso Shot',
                'price_delta' => 5000,
                'is_default' => false,
                'ingredient_id' => $ingredients['espresso_beans']->id,
                'ingredient_qty' => '18.000',
                'sort_order' => 1,
            ],
            [
                'name' => 'Caramel Drizzle',
                'price_delta' => 4000,
                'is_default' => false,
                'ingredient_id' => $ingredients['caramel_syrup']->id,
                'ingredient_qty' => '15.000',
                'sort_order' => 2,
            ],
            [
                'name' => 'Vanilla Foam',
                'price_delta' => 5000,
                'is_default' => false,
                'ingredient_id' => $ingredients['vanilla_syrup']->id,
                'ingredient_qty' => '15.000',
                'sort_order' => 3,
            ],
        ]);

        return [
            'temp' => $temp,
            'sugar' => $sugar,
            'milk' => $milk,
            'addons' => $addons,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private function syncModifierOptions(ModifierGroup $group, array $options): void
    {
        foreach ($options as $option) {
            ModifierOption::query()->updateOrCreate(
                [
                    'modifier_group_id' => $group->id,
                    'name' => $option['name'],
                ],
                [
                    'price_delta' => $option['price_delta'],
                    'is_default' => $option['is_default'],
                    'is_available' => true,
                    'ingredient_id' => $option['ingredient_id'] ?? null,
                    'ingredient_qty' => $option['ingredient_qty'] ?? null,
                    'sort_order' => $option['sort_order'],
                ],
            );
        }
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, Ingredient>  $ingredients
     * @param  array<string, ModifierGroup>  $modifierGroups
     */
    private function seedMenusAndBom(array $categories, array $ingredients, array $modifierGroups): void
    {
        $menus = [
            [
                'category' => 'signature',
                'name' => 'Kopi Susu Gula Aren',
                'slug' => 'kopi-susu-gula-aren',
                'description' => 'Espresso Arabica house blend berpadu susu segar dan gula aren organik.',
                'price' => 28000,
                'badge' => MenuBadge::BestSeller,
                'sort_order' => 1,
                'modifiers' => ['temp', 'sugar', 'milk', 'addons'],
                'bom' => [
                    'espresso_beans' => '18.000',
                    'fresh_milk' => '150.000',
                    'aren_syrup' => '25.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'signature',
                'name' => 'Salted Caramel Latte',
                'slug' => 'salted-caramel-latte',
                'description' => 'Latte lembut dengan sirup salted caramel khas Our Coffee.',
                'price' => 34000,
                'badge' => MenuBadge::BestSeller,
                'sort_order' => 2,
                'modifiers' => ['temp', 'sugar', 'milk', 'addons'],
                'bom' => [
                    'espresso_beans' => '18.000',
                    'fresh_milk' => '160.000',
                    'caramel_syrup' => '25.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'signature',
                'name' => 'Vanilla Oat Cream Latte',
                'slug' => 'vanilla-oat-cream-latte',
                'description' => 'Double ristretto dengan oat milk creamy dan aroma vanilla bean.',
                'price' => 38000,
                'badge' => MenuBadge::New,
                'sort_order' => 3,
                'modifiers' => ['temp', 'sugar', 'addons'],
                'bom' => [
                    'espresso_beans' => '20.000',
                    'oat_milk' => '160.000',
                    'vanilla_syrup' => '20.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'espresso',
                'name' => 'Americano',
                'slug' => 'americano',
                'description' => 'Double shot espresso house blend dengan air mineral dingin atau panas.',
                'price' => 22000,
                'badge' => null,
                'sort_order' => 1,
                'modifiers' => ['temp', 'sugar', 'addons'],
                'bom' => [
                    'espresso_beans' => '18.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'espresso',
                'name' => 'Caffe Latte',
                'slug' => 'caffe-latte',
                'description' => 'Espresso seimbang dengan steamed fresh milk dan microfoam halus.',
                'price' => 28000,
                'badge' => null,
                'sort_order' => 2,
                'modifiers' => ['temp', 'sugar', 'milk', 'addons'],
                'bom' => [
                    'espresso_beans' => '18.000',
                    'fresh_milk' => '170.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'espresso',
                'name' => 'Cappuccino',
                'slug' => 'cappuccino',
                'description' => 'Espresso klasik dengan rasio susu dan foam yang tebal.',
                'price' => 28000,
                'badge' => null,
                'sort_order' => 3,
                'modifiers' => ['temp', 'sugar', 'milk', 'addons'],
                'bom' => [
                    'espresso_beans' => '18.000',
                    'fresh_milk' => '140.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'non_coffee',
                'name' => 'Uji Matcha Latte',
                'slug' => 'uji-matcha-latte',
                'description' => 'Matcha Jepang grade seremonial dikocok lembut bersama susu.',
                'price' => 35000,
                'badge' => MenuBadge::BestSeller,
                'sort_order' => 1,
                'modifiers' => ['temp', 'sugar', 'milk'],
                'bom' => [
                    'matcha_powder' => '8.000',
                    'fresh_milk' => '170.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'non_coffee',
                'name' => 'Signature Dark Chocolate',
                'slug' => 'signature-dark-chocolate',
                'description' => 'Cokelat hitam Belgia pekat dipadukan susu segar.',
                'price' => 32000,
                'badge' => null,
                'sort_order' => 2,
                'modifiers' => ['temp', 'sugar', 'milk'],
                'bom' => [
                    'chocolate_powder' => '25.000',
                    'fresh_milk' => '170.000',
                    'cup_lid' => '1.000',
                ],
            ],
            [
                'category' => 'pastry',
                'name' => 'Butter Croissant',
                'slug' => 'butter-croissant',
                'description' => 'Croissant panggang segar dengan lapisan mentega renyah.',
                'price' => 25000,
                'badge' => MenuBadge::BestSeller,
                'sort_order' => 1,
                'modifiers' => [],
                'bom' => [
                    'croissant_butter' => '1.000',
                ],
            ],
            [
                'category' => 'pastry',
                'name' => 'Pain au Chocolat',
                'slug' => 'pain-au-chocolat',
                'description' => 'Pastry renyah berisi batang dark chocolate panggang.',
                'price' => 28000,
                'badge' => MenuBadge::New,
                'sort_order' => 2,
                'modifiers' => [],
                'bom' => [
                    'pain_au_chocolat' => '1.000',
                ],
            ],
        ];

        foreach ($menus as $item) {
            $menuItem = MenuItem::query()->updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'category_id' => $categories[$item['category']]->id,
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'price' => $item['price'],
                    'badge' => $item['badge'],
                    'is_available' => true,
                    'is_active' => true,
                    'sort_order' => $item['sort_order'],
                ],
            );

            $syncGroups = [];
            foreach ($item['modifiers'] as $index => $groupKey) {
                $syncGroups[$modifierGroups[$groupKey]->id] = ['sort_order' => $index + 1];
            }
            $menuItem->modifierGroups()->sync($syncGroups);

            foreach ($item['bom'] as $ingredientKey => $qty) {
                MenuItemIngredient::query()->updateOrCreate(
                    [
                        'menu_item_id' => $menuItem->id,
                        'ingredient_id' => $ingredients[$ingredientKey]->id,
                    ],
                    [
                        'quantity' => $qty,
                    ],
                );
            }
        }
    }
}
