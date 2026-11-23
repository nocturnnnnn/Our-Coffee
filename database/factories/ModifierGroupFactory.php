<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ModifierSelectionType;
use App\Models\ModifierGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModifierGroup>
 */
class ModifierGroupFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'selection_type' => ModifierSelectionType::Single,
            'is_required' => false,
            'min_select' => 0,
            'max_select' => 1,
            'sort_order' => fake()->numberBetween(1, 10),
        ];
    }
}
