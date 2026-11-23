<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ModifierSelectionType;
use Database\Factories\ModifierGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property ModifierSelectionType $selection_type
 * @property bool $is_required
 * @property int $min_select
 * @property int $max_select
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ModifierGroup extends Model
{
    /** @use HasFactory<ModifierGroupFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'selection_type',
        'is_required',
        'min_select',
        'max_select',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'selection_type' => ModifierSelectionType::class,
            'is_required' => 'boolean',
            'min_select' => 'integer',
            'max_select' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<ModifierOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(ModifierOption::class)->orderBy('sort_order');
    }

    /**
     * @return BelongsToMany<MenuItem, $this>
     */
    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(MenuItem::class, 'menu_item_modifier_group')
            ->withPivot('sort_order');
    }
}
