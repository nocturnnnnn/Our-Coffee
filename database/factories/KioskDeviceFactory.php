<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\KioskDevice;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<KioskDevice>
 */
class KioskDeviceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Kiosk '.fake()->unique()->numberBetween(1, 999),
            'device_token' => Str::random(40),
            'is_active' => true,
            'last_seen_at' => null,
            'paired_by' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
