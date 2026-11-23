<?php

declare(strict_types=1);

namespace App\Enums;

enum IngredientUnit: string
{
    case Gram = 'g';
    case Milliliter = 'ml';
    case Pieces = 'pcs';

    public function label(): string
    {
        return match ($this) {
            self::Gram => 'Gram (g)',
            self::Milliliter => 'Mililiter (ml)',
            self::Pieces => 'Pcs',
        };
    }
}
