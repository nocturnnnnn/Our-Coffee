<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $actor_id
 * @property int|null $authorized_by
 * @property string $action
 * @property string|null $auditable_type
 * @property int|null $auditable_id
 * @property string|null $reason
 * @property array<string, mixed>|null $metadata
 * @property string|null $ip_address
 * @property Carbon|null $created_at
 */
class AuditLog extends Model
{
    public const ?string UPDATED_AT = null;

    protected $fillable = [
        'actor_id',
        'authorized_by',
        'action',
        'auditable_type',
        'auditable_id',
        'reason',
        'metadata',
        'ip_address',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function authorizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }
}
