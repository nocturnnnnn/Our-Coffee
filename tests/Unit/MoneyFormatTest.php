<?php

declare(strict_types=1);

use App\Support\Money;

test('formats positive zero and negative integer rupiah values in id-ID format', function () {
    expect(Money::format(0))->toBe('Rp 0')
        ->and(Money::format(28000))->toBe('Rp 28.000')
        ->and(Money::format(1250000))->toBe('Rp 1.250.000')
        ->and(Money::format(-5000))->toBe('-Rp 5.000');
});

test('formats signed rupiah values for cash variance', function () {
    expect(Money::formatSigned(0))->toBe('Rp 0')
        ->and(Money::formatSigned(15000))->toBe('+Rp 15.000')
        ->and(Money::formatSigned(-12500))->toBe('-Rp 12.500');
});
