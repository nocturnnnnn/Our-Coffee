<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $key
 * @property string|null $value
 * @property int|null $updated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'updated_by',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function getValue(string $key, ?string $default = null): ?string
    {
        $setting = self::query()->find($key);

        return $setting !== null ? ($setting->value ?? $default) : $default;
    }

    public static function setValue(string $key, ?string $value, ?int $updatedBy = null): self
    {
        return self::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'updated_by' => $updatedBy,
            ],
        );
    }
}
