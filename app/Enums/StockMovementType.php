<?php

declare(strict_types=1);

namespace App\Enums;

enum StockMovementType: string
{
    case Sale = 'sale';
    case Restock = 'restock';
    case Waste = 'waste';
    case Opname = 'opname';

    public function label(): string
    {
        return match ($this) {
            self::Sale => 'Penjualan',
            self::Restock => 'Stock In',
            self::Waste => 'Waste / Rusak',
            self::Opname => 'Stock Opname',
        };
    }
}
