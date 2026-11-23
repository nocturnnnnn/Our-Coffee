<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CashierShiftStatus;
use Database\Factories\CashierShiftFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property CashierShiftStatus $status
 * @property int $opening_cash
 * @property int|null $expected_cash
 * @property int|null $actual_cash
 * @property int|null $variance
 * @property string|null $variance_reason
 * @property Carbon $opened_at
 * @property Carbon|null $closed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class CashierShift extends Model
{
    /** @use HasFactory<CashierShiftFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'opening_cash',
        'expected_cash',
        'actual_cash',
        'variance',
        'variance_reason',
        'opened_at',
        'closed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => CashierShiftStatus::class,
            'opening_cash' => 'integer',
            'expected_cash' => 'integer',
            'actual_cash' => 'integer',
            'variance' => 'integer',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isOpen(): bool
    {
        return $this->status === CashierShiftStatus::Open;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
