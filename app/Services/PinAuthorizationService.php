<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\InvalidPinException;
use App\Models\User;

class PinAuthorizationService
{
    /**
     * Verify a 6-digit Admin/Supervisor authorization PIN.
     */
    public function verifyAdminPin(string $pin): User
    {
        if (preg_match('/^\d{6}$/', $pin) !== 1) {
            throw new InvalidPinException('PIN Admin harus terdiri dari 6 digit angka.');
        }

        $admins = User::query()
            ->where('role', UserRole::Admin->value)
            ->where('is_active', true)
            ->whereNotNull('pin_hash')
            ->get();

        foreach ($admins as $admin) {
            if ($admin->verifyPin($pin)) {
                return $admin;
            }
        }

        throw new InvalidPinException('PIN Admin tidak valid.');
    }
}
