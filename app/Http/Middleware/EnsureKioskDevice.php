<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\KioskDevice;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureKioskDevice
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie('kiosk_device_token')
            ?? $request->header('X-Kiosk-Device-Token');

        if (! is_string($token) || $token === '') {
            abort(403, 'Perangkat Kiosk belum dipasangkan.');
        }

        $device = KioskDevice::query()
            ->where('device_token', $token)
            ->where('is_active', true)
            ->first();

        if ($device === null) {
            abort(403, 'Token perangkat Kiosk tidak valid atau tidak aktif.');
        }

        if ($device->last_seen_at === null || $device->last_seen_at->lt(now()->subMinute())) {
            $device->forceFill(['last_seen_at' => now()])->saveQuietly();
        }

        $request->attributes->set('kiosk_device', $device);

        return $next($request);
    }
}
