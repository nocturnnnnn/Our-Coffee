<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->is_active) {
            abort(403, 'Akun staf tidak aktif atau tidak terautentikasi.');
        }

        if (! in_array($user->role->value, $roles, true)) {
            abort(403, 'Anda tidak memiliki hak akses ke modul ini.');
        }

        return $next($request);
    }
}
