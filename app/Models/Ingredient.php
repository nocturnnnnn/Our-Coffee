<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\IngredientUnit;
use Database\Factories\IngredientFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $sku
 * @property IngredientUnit $unit
 * @property string $current_stock
 * @property string $min_stock
 * @property int $cost_per_unit
 * @property int|null $default_distributor_id
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Ingredient extends Model
{
    /** @use HasFactory<IngredientFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'sku',
        'unit',
        'current_stock',
        'min_stock',
        'cost_per_unit',
        'default_distributor_id',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'unit' => IngredientUnit::class,
            'current_stock' => 'decimal:3',
            'min_stock' => 'decimal:3',
            'cost_per_unit' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function isLowStock(): bool
    {
        return (float) $this->current_stock <= (float) $this->min_stock;
    }

    /**
     * @return BelongsTo<Distributor, $this>
     */
    public function defaultDistributor(): BelongsTo
    {
        return $this->belongsTo(Distributor::class, 'default_distributor_id');
    }

    /**
     * @return HasMany<MenuItemIngredient, $this>
     */
    public function recipeUsages(): HasMany
    {
        return $this->hasMany(MenuItemIngredient::class);
    }

    /**
     * @return HasMany<StockMovement, $this>
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
