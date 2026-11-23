<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CashierShiftStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property UserRole $role
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $pin_hash
 * @property bool $is_active
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'role', 'pin_hash', 'is_active'])]
#[Hidden(['password', 'pin_hash', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'pin_hash' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
        ];
    }

    public function hasRole(UserRole ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isKasir(): bool
    {
        return $this->role === UserRole::Kasir;
    }

    public function isBarista(): bool
    {
        return $this->role === UserRole::Barista;
    }

    public function verifyPin(string $pin): bool
    {
        if ($this->pin_hash === null || $this->pin_hash === '') {
            return false;
        }

        return Hash::check($pin, $this->pin_hash);
    }

    public function homeRoute(): string
    {
        return $this->role->homeRoute();
    }

    /**
     * @return HasMany<CashierShift, $this>
     */
    public function cashierShifts(): HasMany
    {
        return $this->hasMany(CashierShift::class);
    }

    /**
     * @return HasOne<CashierShift, $this>
     */
    public function activeShift(): HasOne
    {
        return $this->hasOne(CashierShift::class)
            ->where('status', CashierShiftStatus::Open->value)
            ->latestOfMany('opened_at');
    }
}
