<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int $menu_item_id
 * @property string $menu_item_name
 * @property int $unit_price
 * @property int $modifiers_total
 * @property int $unit_cogs
 * @property int $quantity
 * @property int $line_total
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'menu_item_id',
        'menu_item_name',
        'unit_price',
        'modifiers_total',
        'unit_cogs',
        'quantity',
        'line_total',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'unit_price' => 'integer',
            'modifiers_total' => 'integer',
            'unit_cogs' => 'integer',
            'quantity' => 'integer',
            'line_total' => 'integer',
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
     * @return BelongsTo<MenuItem, $this>
     */
    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    /**
     * @return HasMany<OrderItemModifier, $this>
     */
    public function modifiers(): HasMany
    {
        return $this->hasMany(OrderItemModifier::class);
    }
}
