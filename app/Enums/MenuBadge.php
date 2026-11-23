<?php

declare(strict_types=1);

namespace App\Enums;

enum MenuBadge: string
{
    case BestSeller = 'best_seller';
    case New = 'new';

    public function label(): string
    {
        return match ($this) {
            self::BestSeller => 'Best Seller',
            self::New => 'New',
        };
    }
}
