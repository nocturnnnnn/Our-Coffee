<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModifierOption>
 */
class ModifierOptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'modifier_group_id' => ModifierGroup::factory(),
            'name' => fake()->word(),
            'price_delta' => 0,
            'is_default' => false,
            'is_available' => true,
            'ingredient_id' => null,
            'ingredient_qty' => null,
            'sort_order' => fake()->numberBetween(1, 10),
        ];
    }
}
