<?php

declare(strict_types=1);

namespace App\Enums;

enum OrderStatus: string
{
    case PendingPayment = 'pending_payment';
    case Paid = 'paid';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Voided = 'voided';

    public function label(): string
    {
        return match ($this) {
            self::PendingPayment => 'Menunggu Pembayaran',
            self::Paid => 'Lunas',
            self::Preparing => 'Sedang Disiapkan',
            self::Ready => 'Siap Diambil',
            self::Completed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
            self::Voided => 'Void',
        };
    }
}
