<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class InvalidOrderTransitionException extends RuntimeException
{
    public function __construct(string $message = 'Perubahan status pesanan tidak valid.')
    {
        parent::__construct($message, 422);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
        ], 422);
    }
}
