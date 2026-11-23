<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\IngredientUnit;
use App\Models\Distributor;
use App\Models\Ingredient;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Ingredient>
 */
class IngredientFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = implode(' ', (array) fake()->words(2));

        return [
            'name' => Str::title($name),
            'sku' => 'ING-'.fake()->unique()->numerify('####'),
            'unit' => fake()->randomElement(IngredientUnit::cases()),
            'current_stock' => '1000.000',
            'min_stock' => '100.000',
            'cost_per_unit' => fake()->numberBetween(15, 250),
            'default_distributor_id' => Distributor::factory(),
            'is_active' => true,
        ];
    }
}
