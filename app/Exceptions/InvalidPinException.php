<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class InvalidPinException extends RuntimeException
{
    public function __construct(string $message = 'PIN otorisasi tidak valid.')
    {
        parent::__construct($message, 403);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
        ], 403);
    }
}
