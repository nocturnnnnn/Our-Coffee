<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\QrisGatewayInterface;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

class SimulatedQrisGateway implements QrisGatewayInterface
{
    public function createCharge(Order $order, int $expirySeconds): array
    {
        $reference = 'QRIS-'.$order->order_number.'-'.strtoupper(Str::random(6));
        $expiresAt = now('Asia/Jakarta')->addSeconds(max(30, $expirySeconds));

        $payload = sprintf(
            '00020101021226580016ID.OURCOFFEE.QRIS0118%s520458145303360540%d5802ID5910OUR COFFEE6007JAKARTA6220%s6304SIMU',
            $reference,
            $order->total_amount,
            $order->queue_number,
        );

        return [
            'reference' => $reference,
            'payload' => $payload,
            'expires_at' => $expiresAt,
        ];
    }

    public function checkStatus(Payment $payment): PaymentStatus
    {
        if (
            $payment->status === PaymentStatus::Pending
            && $payment->qris_expires_at !== null
            && $payment->qris_expires_at->isPast()
        ) {
            return PaymentStatus::Expired;
        }

        return $payment->status;
    }
}
