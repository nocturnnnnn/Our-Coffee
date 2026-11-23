<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property PaymentMethod $method
 * @property PaymentStatus $status
 * @property int $amount
 * @property int|null $cash_received
 * @property int|null $change_amount
 * @property string|null $qris_reference
 * @property string|null $qris_payload
 * @property Carbon|null $qris_expires_at
 * @property Carbon|null $paid_at
 * @property int|null $processed_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'method',
        'status',
        'amount',
        'cash_received',
        'change_amount',
        'qris_reference',
        'qris_payload',
        'qris_expires_at',
        'paid_at',
        'processed_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount' => 'integer',
            'cash_received' => 'integer',
            'change_amount' => 'integer',
            'qris_expires_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
