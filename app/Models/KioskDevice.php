<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\KioskDeviceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $device_token
 * @property bool $is_active
 * @property Carbon|null $last_seen_at
 * @property int|null $paired_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class KioskDevice extends Model
{
    /** @use HasFactory<KioskDeviceFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'device_token',
        'is_active',
        'last_seen_at',
        'paired_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function pairedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paired_by');
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
