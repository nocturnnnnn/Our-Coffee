<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\StockMovementType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $ingredient_id
 * @property StockMovementType $type
 * @property string $quantity_change
 * @property string $stock_before
 * @property string $stock_after
 * @property int|null $unit_cost
 * @property int|null $total_cost
 * @property int|null $distributor_id
 * @property string|null $reference_type
 * @property int|null $reference_id
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 */
class StockMovement extends Model
{
    public const ?string UPDATED_AT = null;

    protected $fillable = [
        'ingredient_id',
        'type',
        'quantity_change',
        'stock_before',
        'stock_after',
        'unit_cost',
        'total_cost',
        'distributor_id',
        'reference_type',
        'reference_id',
        'notes',
        'created_by',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'quantity_change' => 'decimal:3',
            'stock_before' => 'decimal:3',
            'stock_after' => 'decimal:3',
            'unit_cost' => 'integer',
            'total_cost' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Ingredient, $this>
     */
    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    /**
     * @return BelongsTo<Distributor, $this>
     */
    public function distributor(): BelongsTo
    {
        return $this->belongsTo(Distributor::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
