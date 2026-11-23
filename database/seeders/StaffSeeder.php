<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\KioskDevice;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@ourcoffee.test'],
            [
                'name' => 'Owner Our Coffee',
                'role' => UserRole::Admin,
                'password' => Hash::make('password'),
                'pin_hash' => Hash::make('123456'),
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'kasir@ourcoffee.test'],
            [
                'name' => 'Kasir Shift 1',
                'role' => UserRole::Kasir,
                'password' => Hash::make('password'),
                'pin_hash' => null,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'barista@ourcoffee.test'],
            [
                'name' => 'Head Barista',
                'role' => UserRole::Barista,
                'password' => Hash::make('password'),
                'pin_hash' => null,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        KioskDevice::query()->updateOrCreate(
            ['device_token' => 'our-coffee-kiosk-lobby-1-token'],
            [
                'name' => 'Kiosk Lobby 1',
                'is_active' => true,
                'paired_by' => $admin->id,
            ],
        );
    }
}
