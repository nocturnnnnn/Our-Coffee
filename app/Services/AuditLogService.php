<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogService
{
    /**
     * Record an immutable audit log entry.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        string $action,
        ?int $actorId = null,
        ?int $authorizedById = null,
        ?Model $auditable = null,
        ?string $reason = null,
        array $metadata = [],
        ?string $ipAddress = null,
    ): AuditLog {
        return AuditLog::query()->create([
            'actor_id' => $actorId,
            'authorized_by' => $authorizedById,
            'action' => $action,
            'auditable_type' => $auditable !== null ? $auditable::class : null,
            'auditable_id' => $auditable?->getKey(),
            'reason' => $reason,
            'metadata' => $metadata !== [] ? $metadata : null,
            'ip_address' => $ipAddress ?? (app()->runningInConsole() ? null : request()->ip()),
            'created_at' => now('Asia/Jakarta'),
        ]);
    }
}
