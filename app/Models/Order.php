<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $order_number
 * @property string $queue_number
 * @property Carbon $queue_date
 * @property OrderChannel $channel
 * @property OrderType $order_type
 * @property string|null $customer_name
 * @property OrderStatus $status
 * @property int $subtotal
 * @property int $discount_amount
 * @property string|null $discount_reason
 * @property int|null $discount_authorized_by
 * @property int $total_amount
 * @property int $cogs_total
 * @property int|null $cashier_shift_id
 * @property int|null $cashier_id
 * @property int|null $kiosk_device_id
 * @property string|null $void_reason
 * @property int|null $void_authorized_by
 * @property Carbon|null $paid_at
 * @property Carbon|null $preparing_at
 * @property Carbon|null $ready_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $voided_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Order extends Model
{
    protected $fillable = [
        'order_number',
        'queue_number',
        'queue_date',
        'channel',
        'order_type',
        'customer_name',
        'status',
        'subtotal',
        'discount_amount',
        'discount_reason',
        'discount_authorized_by',
        'total_amount',
        'cogs_total',
        'cashier_shift_id',
        'cashier_id',
        'kiosk_device_id',
        'void_reason',
        'void_authorized_by',
        'paid_at',
        'preparing_at',
        'ready_at',
        'completed_at',
        'voided_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'queue_date' => 'date',
            'channel' => OrderChannel::class,
            'order_type' => OrderType::class,
            'status' => OrderStatus::class,
            'subtotal' => 'integer',
            'discount_amount' => 'integer',
            'total_amount' => 'integer',
            'cogs_total' => 'integer',
            'paid_at' => 'datetime',
            'preparing_at' => 'datetime',
            'ready_at' => 'datetime',
            'completed_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return BelongsTo<CashierShift, $this>
     */
    public function cashierShift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * @return BelongsTo<KioskDevice, $this>
     */
    public function kioskDevice(): BelongsTo
    {
        return $this->belongsTo(KioskDevice::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function discountAuthorizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'discount_authorized_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function voidAuthorizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'void_authorized_by');
    }
}
