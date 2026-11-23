<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModifierOptionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $modifier_group_id
 * @property string $name
 * @property int $price_delta
 * @property bool $is_default
 * @property bool $is_available
 * @property int|null $ingredient_id
 * @property string|null $ingredient_qty
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ModifierOption extends Model
{
    /** @use HasFactory<ModifierOptionFactory> */
    use HasFactory;

    protected $fillable = [
        'modifier_group_id',
        'name',
        'price_delta',
        'is_default',
        'is_available',
        'ingredient_id',
        'ingredient_qty',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_delta' => 'integer',
            'is_default' => 'boolean',
            'is_available' => 'boolean',
            'ingredient_qty' => 'decimal:3',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ModifierGroup, $this>
     */
    public function modifierGroup(): BelongsTo
    {
        return $this->belongsTo(ModifierGroup::class);
    }

    /**
     * @return BelongsTo<Ingredient, $this>
     */
    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }
}
