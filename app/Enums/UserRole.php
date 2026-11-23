<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Kasir = 'kasir';
    case Barista = 'barista';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Kasir => 'Kasir',
            self::Barista => 'Barista',
        };
    }

    public function homeRoute(): string
    {
        return match ($this) {
            self::Admin => 'admin.dashboard',
            self::Kasir => 'pos.index',
            self::Barista => 'kds.index',
        };
    }
}
