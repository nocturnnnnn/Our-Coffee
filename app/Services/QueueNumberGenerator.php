<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class QueueNumberGenerator
{
    /**
     * Generate the next daily queue number (e.g. A-001) and unique order number for Asia/Jakarta date.
     *
     * @return array{queue_date: string, queue_number: string, order_number: string}
     */
    public function nextForDate(?CarbonInterface $date = null): array
    {
        $jakartaDate = ($date ?? now('Asia/Jakarta'))->setTimezone('Asia/Jakarta');
        $queueDate = $jakartaDate->format('Y-m-d');
        $dateCompact = $jakartaDate->format('Ymd');

        return DB::transaction(function () use ($queueDate, $dateCompact): array {
            $latestOrder = Order::query()
                ->whereDate('queue_date', $queueDate)
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $nextSequence = 1;
            if ($latestOrder !== null && preg_match('/A-(\d+)$/', $latestOrder->queue_number, $matches) === 1) {
                $nextSequence = ((int) $matches[1]) + 1;
            }

            $paddedQueue = str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $paddedOrder = str_pad((string) $nextSequence, 4, '0', STR_PAD_LEFT);

            return [
                'queue_date' => $queueDate,
                'queue_number' => 'A-'.$paddedQueue,
                'order_number' => sprintf('OC-%s-%s', $dateCompact, $paddedOrder),
            ];
        });
    }
}
