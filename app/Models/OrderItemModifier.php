<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_item_id
 * @property int|null $modifier_option_id
 * @property string $modifier_group_name
 * @property string $modifier_option_name
 * @property int $price_delta
 * @property bool $is_default
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class OrderItemModifier extends Model
{
    protected $fillable = [
        'order_item_id',
        'modifier_option_id',
        'modifier_group_name',
        'modifier_option_name',
        'price_delta',
        'is_default',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_delta' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<OrderItem, $this>
     */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    /**
     * @return BelongsTo<ModifierOption, $this>
     */
    public function modifierOption(): BelongsTo
    {
        return $this->belongsTo(ModifierOption::class);
    }
}
