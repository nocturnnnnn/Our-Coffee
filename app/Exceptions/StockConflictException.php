<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class StockConflictException extends RuntimeException
{
    /**
     * @param  array<int, array{menu_item_id: int, menu_item_name: string, reason: string}>  $conflicts
     */
    public function __construct(
        public readonly array $conflicts,
        string $message = 'Beberapa item pada pesanan tidak tersedia atau stok bahan baku tidak mencukupi.',
    ) {
        parent::__construct($message, 409);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'conflicts' => $this->conflicts,
        ], 409);
    }
}
