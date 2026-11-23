<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CashierShiftStatus;
use App\Models\CashierShift;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CashierShift>
 */
class CashierShiftFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->kasir(),
            'status' => CashierShiftStatus::Open,
            'opening_cash' => 500000,
            'expected_cash' => null,
            'actual_cash' => null,
            'variance' => null,
            'variance_reason' => null,
            'opened_at' => now(),
            'closed_at' => null,
        ];
    }

    public function closed(int $expectedCash = 750000, int $actualCash = 750000, ?string $reason = null): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CashierShiftStatus::Closed,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'variance' => $actualCash - $expectedCash,
            'variance_reason' => $reason,
            'closed_at' => now(),
        ]);
    }
}
