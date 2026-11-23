<?php

declare(strict_types=1);

namespace App\Enums;

enum ModifierSelectionType: string
{
    case Single = 'single';
    case Multiple = 'multiple';

    public function label(): string
    {
        return match ($this) {
            self::Single => 'Pilih Satu',
            self::Multiple => 'Pilih Banyak',
        };
    }
}
