<?php

declare(strict_types=1);

namespace App\Support;

final class Money
{
    /**
     * Format an integer Rupiah amount into id-ID display string (e.g. "Rp 28.000").
     */
    public static function format(int $amount): string
    {
        $formatted = number_format(abs($amount), 0, ',', '.');

        return $amount < 0 ? '-Rp '.$formatted : 'Rp '.$formatted;
    }

    /**
     * Format an integer Rupiah amount with explicit sign for positive/negative variance.
     */
    public static function formatSigned(int $amount): string
    {
        if ($amount === 0) {
            return 'Rp 0';
        }

        $prefix = $amount > 0 ? '+Rp ' : '-Rp ';

        return $prefix.number_format(abs($amount), 0, ',', '.');
    }
}
