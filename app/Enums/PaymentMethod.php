<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentMethod: string
{
    case Qris = 'qris';
    case Cash = 'cash';
    case Edc = 'edc';
    case QrisManual = 'qris_manual';

    public function label(): string
    {
        return match ($this) {
            self::Qris => 'QRIS',
            self::Cash => 'Tunai',
            self::Edc => 'EDC / Kartu',
            self::QrisManual => 'QRIS Manual',
        };
    }
}
