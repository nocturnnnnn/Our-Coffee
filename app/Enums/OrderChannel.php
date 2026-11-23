<?php

declare(strict_types=1);

namespace App\Enums;

enum OrderChannel: string
{
    case Kiosk = 'kiosk';
    case Pos = 'pos';

    public function label(): string
    {
        return match ($this) {
            self::Kiosk => 'Kiosk',
            self::Pos => 'POS Kasir',
        };
    }
}
