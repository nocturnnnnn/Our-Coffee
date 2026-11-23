<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use App\Models\MenuItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MenuItem>
 */
class MenuItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $words = implode(' ', (array) fake()->words(3));
        $name = Str::title($words);

        return [
            'category_id' => Category::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 9999),
            'description' => fake()->sentence(),
            'price' => fake()->numberBetween(20, 48) * 1000,
            'image_path' => null,
            'badge' => null,
            'is_available' => true,
            'is_active' => true,
            'sort_order' => fake()->numberBetween(1, 50),
        ];
    }
}
