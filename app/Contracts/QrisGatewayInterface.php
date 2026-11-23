<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Carbon\CarbonInterface;

interface QrisGatewayInterface
{
    /**
     * Create a dynamic QRIS payment charge for an order.
     *
     * @return array{reference: string, payload: string, expires_at: CarbonInterface}
     */
    public function createCharge(Order $order, int $expirySeconds): array;

    /**
     * Check current status of an existing QRIS payment.
     */
    public function checkStatus(Payment $payment): PaymentStatus;
}
