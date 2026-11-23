<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Distributor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Distributor>
 */
class DistributorFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'contact_person' => fake()->name(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'notes' => null,
            'is_active' => true,
        ];
    }
}
