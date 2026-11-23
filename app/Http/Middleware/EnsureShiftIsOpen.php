<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureShiftIsOpen
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        if (! $user->activeShift()->exists()) {
            return redirect()
                ->route('pos.shift')
                ->with('error', 'Silakan buka shift kasir terlebih dahulu sebelum mengakses POS.');
        }

        return $next($request);
    }
}
