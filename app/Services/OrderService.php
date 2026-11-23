<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\QrisGatewayInterface;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\InvalidOrderTransitionException;
use App\Exceptions\StockConflictException;
use App\Models\AppSetting;
use App\Models\MenuItem;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemModifier;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class OrderService
{
    public function __construct(
        private readonly BomCostService $bomCostService,
        private readonly MenuAvailabilityService $availabilityService,
        private readonly InventoryService $inventoryService,
        private readonly QueueNumberGenerator $queueNumberGenerator,
        private readonly QrisGatewayInterface $qrisGateway,
        private readonly PinAuthorizationService $pinAuthorizationService,
        private readonly AuditLogService $auditLogService,
    ) {}

    /**
     * Create a new pending order from Kiosk or POS cart items.
     *
     * @param  array{
     *     channel: OrderChannel,
     *     order_type: OrderType,
     *     customer_name?: string|null,
     *     kiosk_device_id?: int|null,
     *     cashier_shift_id?: int|null,
     *     cashier_id?: int|null,
     *     discount_amount?: int,
     *     discount_reason?: string|null,
     *     discount_authorized_by?: int|null,
     *     items: array<int, array{
     *         menu_item_id: int,
     *         quantity: int,
     *         notes?: string|null,
     *         modifier_option_ids?: array<int, int>,
     *     }>,
     * }  $payload
     */
    public function createOrder(array $payload): Order
    {
        if ($payload['items'] === []) {
            throw new InvalidArgumentException('Keranjang pesanan tidak boleh kosong.');
        }

        $conflicts = $this->availabilityService->findUnavailableCartItems($payload['items']);
        if ($conflicts !== []) {
            throw new StockConflictException($conflicts);
        }

        return DB::transaction(function () use ($payload): Order {
            $sequence = $this->queueNumberGenerator->nextForDate();

            $menuIds = array_values(array_unique(array_column($payload['items'], 'menu_item_id')));
            $menus = MenuItem::query()
                ->with('recipeItems.ingredient')
                ->whereIn('id', $menuIds)
                ->get()
                ->keyBy('id');

            $allOptionIds = [];
            foreach ($payload['items'] as $item) {
                foreach ($item['modifier_option_ids'] ?? [] as $optId) {
                    $allOptionIds[] = $optId;
                }
            }

            $options = $allOptionIds !== []
                ? ModifierOption::query()
                    ->with(['modifierGroup', 'ingredient'])
                    ->whereIn('id', array_unique($allOptionIds))
                    ->get()
                    ->keyBy('id')
                : collect();

            $subtotal = 0;
            $cogsTotal = 0;
            $preparedItems = [];

            foreach ($payload['items'] as $itemPayload) {
                $menu = $menus->get($itemPayload['menu_item_id']);
                if ($menu === null) {
                    throw new StockConflictException([
                        [
                            'menu_item_id' => $itemPayload['menu_item_id'],
                            'menu_item_name' => 'Menu tidak ditemukan',
                            'reason' => 'Menu sudah dihapus atau tidak tersedia',
                        ],
                    ]);
                }

                $qty = max(1, $itemPayload['quantity']);
                $selectedOptionIds = $itemPayload['modifier_option_ids'] ?? [];
                $modifiersTotal = 0;
                $modifierSnapshots = [];

                foreach ($selectedOptionIds as $optionId) {
                    $option = $options->get($optionId);
                    if ($option === null) {
                        continue;
                    }

                    $modifiersTotal += $option->price_delta;
                    $modifierSnapshots[] = [
                        'modifier_option_id' => $option->id,
                        'modifier_group_name' => $option->modifierGroup->name,
                        'modifier_option_name' => $option->name,
                        'price_delta' => $option->price_delta,
                        'is_default' => $option->is_default,
                    ];
                }

                $unitCogs = $this->bomCostService->calculateCogs($menu, $selectedOptionIds);
                $lineTotal = ($menu->price + $modifiersTotal) * $qty;

                $subtotal += $lineTotal;
                $cogsTotal += $unitCogs * $qty;

                $preparedItems[] = [
                    'menu_item_id' => $menu->id,
                    'menu_item_name' => $menu->name,
                    'unit_price' => $menu->price,
                    'modifiers_total' => $modifiersTotal,
                    'unit_cogs' => $unitCogs,
                    'quantity' => $qty,
                    'line_total' => $lineTotal,
                    'notes' => $itemPayload['notes'] ?? null,
                    'modifiers' => $modifierSnapshots,
                ];
            }

            $discountAmount = max(0, min($subtotal, (int) ($payload['discount_amount'] ?? 0)));
            $totalAmount = max(0, $subtotal - $discountAmount);

            $order = Order::query()->create([
                'order_number' => $sequence['order_number'],
                'queue_number' => $sequence['queue_number'],
                'queue_date' => $sequence['queue_date'],
                'channel' => $payload['channel'],
                'order_type' => $payload['order_type'],
                'customer_name' => $payload['customer_name'] ?? null,
                'status' => OrderStatus::PendingPayment,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'discount_reason' => $discountAmount > 0 ? ($payload['discount_reason'] ?? null) : null,
                'discount_authorized_by' => $discountAmount > 0 ? ($payload['discount_authorized_by'] ?? null) : null,
                'total_amount' => $totalAmount,
                'cogs_total' => $cogsTotal,
                'cashier_shift_id' => $payload['cashier_shift_id'] ?? null,
                'cashier_id' => $payload['cashier_id'] ?? null,
                'kiosk_device_id' => $payload['kiosk_device_id'] ?? null,
            ]);

            foreach ($preparedItems as $preparedItem) {
                $modifiers = $preparedItem['modifiers'];
                unset($preparedItem['modifiers']);

                $orderItem = OrderItem::query()->create([
                    'order_id' => $order->id,
                    ...$preparedItem,
                ]);

                foreach ($modifiers as $modifierSnapshot) {
                    OrderItemModifier::query()->create([
                        'order_item_id' => $orderItem->id,
                        ...$modifierSnapshot,
                    ]);
                }
            }

            if ($discountAmount > 0) {
                $this->auditLogService->record(
                    action: 'order.discount',
                    actorId: $payload['cashier_id'] ?? null,
                    authorizedById: $payload['discount_authorized_by'] ?? null,
                    auditable: $order,
                    reason: $payload['discount_reason'] ?? 'Diskon pesanan',
                    metadata: [
                        'order_number' => $order->order_number,
                        'subtotal' => $subtotal,
                        'discount_amount' => $discountAmount,
                        'total_amount' => $totalAmount,
                    ],
                );
            }

            return $order->load(['items.modifiers', 'payments']);
        });
    }

    public function createQrisPayment(Order $order): Payment
    {
        if ($order->status !== OrderStatus::PendingPayment) {
            throw new InvalidOrderTransitionException('QRIS hanya dapat dibuat untuk pesanan berstatus menunggu pembayaran.');
        }

        $expirySeconds = (int) (AppSetting::getValue('qris_expiry_seconds', '300') ?? '300');
        $charge = $this->qrisGateway->createCharge($order, $expirySeconds);

        return DB::transaction(function () use ($order, $charge): Payment {
            Payment::query()
                ->where('order_id', $order->id)
                ->where('method', PaymentMethod::Qris->value)
                ->where('status', PaymentStatus::Pending->value)
                ->update(['status' => PaymentStatus::Expired->value]);

            return Payment::query()->create([
                'order_id' => $order->id,
                'method' => PaymentMethod::Qris,
                'status' => PaymentStatus::Pending,
                'amount' => $order->total_amount,
                'qris_reference' => $charge['reference'],
                'qris_payload' => $charge['payload'],
                'qris_expires_at' => $charge['expires_at'],
            ]);
        });
    }

    public function refreshQrisStatus(Payment $payment): PaymentStatus
    {
        $status = $this->qrisGateway->checkStatus($payment);

        if ($status !== $payment->status) {
            $payment->forceFill(['status' => $status])->save();
        }

        return $status;
    }

    /**
     * Mark an order as paid and atomically deduct BOM ingredients.
     */
    public function markPaid(
        Order $order,
        PaymentMethod $method,
        ?int $cashReceived = null,
        ?int $processedById = null,
        ?int $cashierShiftId = null,
        ?Payment $existingPayment = null,
    ): Order {
        return DB::transaction(function () use ($order, $method, $cashReceived, $processedById, $cashierShiftId, $existingPayment): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::PendingPayment) {
                throw new InvalidOrderTransitionException('Pesanan tidak berada dalam status menunggu pembayaran.');
            }

            $changeAmount = null;
            if ($method === PaymentMethod::Cash) {
                if ($cashReceived === null || $cashReceived < $lockedOrder->total_amount) {
                    throw new InvalidArgumentException('Nominal uang tunai kurang dari total tagihan.');
                }

                $changeAmount = $cashReceived - $lockedOrder->total_amount;
            }

            $this->inventoryService->deductForOrder($lockedOrder, $processedById);

            $now = now('Asia/Jakarta');

            if ($existingPayment !== null) {
                $existingPayment->forceFill([
                    'method' => $method,
                    'status' => PaymentStatus::Paid,
                    'amount' => $lockedOrder->total_amount,
                    'cash_received' => $cashReceived,
                    'change_amount' => $changeAmount,
                    'paid_at' => $now,
                    'processed_by' => $processedById,
                ])->save();
            } else {
                Payment::query()->create([
                    'order_id' => $lockedOrder->id,
                    'method' => $method,
                    'status' => PaymentStatus::Paid,
                    'amount' => $lockedOrder->total_amount,
                    'cash_received' => $cashReceived,
                    'change_amount' => $changeAmount,
                    'paid_at' => $now,
                    'processed_by' => $processedById,
                ]);
            }

            Payment::query()
                ->where('order_id', $lockedOrder->id)
                ->where('status', PaymentStatus::Pending->value)
                ->update(['status' => PaymentStatus::Expired->value]);

            $lockedOrder->forceFill([
                'status' => OrderStatus::Paid,
                'paid_at' => $now,
                'cashier_id' => $processedById ?? $lockedOrder->cashier_id,
                'cashier_shift_id' => $cashierShiftId ?? $lockedOrder->cashier_shift_id,
            ])->save();

            return $lockedOrder->fresh(['items.modifiers', 'payments']) ?? $lockedOrder;
        });
    }

    /**
     * Transition KDS order status (supports 1-step forward and 1-step undo).
     */
    public function transitionStatus(Order $order, OrderStatus $targetStatus): Order
    {
        $allowedTransitions = [
            OrderStatus::Paid->value => [OrderStatus::Preparing],
            OrderStatus::Preparing->value => [OrderStatus::Ready, OrderStatus::Paid],
            OrderStatus::Ready->value => [OrderStatus::Completed, OrderStatus::Preparing],
            OrderStatus::Completed->value => [OrderStatus::Ready],
        ];

        $current = $order->status;
        $allowed = $allowedTransitions[$current->value] ?? [];

        if (! in_array($targetStatus, $allowed, true)) {
            throw new InvalidOrderTransitionException(sprintf(
                'Transisi status dari "%s" ke "%s" tidak diperbolehkan.',
                $current->label(),
                $targetStatus->label(),
            ));
        }

        $now = now('Asia/Jakarta');

        $updates = match ($targetStatus) {
            OrderStatus::Paid => [
                'status' => OrderStatus::Paid,
                'preparing_at' => null,
                'ready_at' => null,
                'completed_at' => null,
            ],
            OrderStatus::Preparing => [
                'status' => OrderStatus::Preparing,
                'preparing_at' => $order->preparing_at ?? $now,
                'ready_at' => null,
                'completed_at' => null,
            ],
            OrderStatus::Ready => [
                'status' => OrderStatus::Ready,
                'ready_at' => $order->ready_at ?? $now,
                'completed_at' => null,
            ],
            OrderStatus::Completed => [
                'status' => OrderStatus::Completed,
                'completed_at' => $now,
            ],
        };

        $order->forceFill($updates)->save();

        return $order->fresh() ?? $order;
    }

    /**
     * Void an order with mandatory 6-digit Admin PIN authorization and reason.
     */
    public function voidOrder(Order $order, string $reason, string $adminPin, ?int $actorId = null): Order
    {
        $trimmedReason = trim($reason);
        if ($trimmedReason === '') {
            throw new InvalidArgumentException('Alasan void wajib diisi.');
        }

        if (in_array($order->status, [OrderStatus::Voided, OrderStatus::Cancelled], true)) {
            throw new InvalidOrderTransitionException('Pesanan sudah dibatalkan atau di-void sebelumnya.');
        }

        $authorizer = $this->pinAuthorizationService->verifyAdminPin($adminPin);

        return DB::transaction(function () use ($order, $trimmedReason, $authorizer, $actorId): Order {
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            $previousStatus = $lockedOrder->status->value;
            $now = now('Asia/Jakarta');

            $lockedOrder->forceFill([
                'status' => OrderStatus::Voided,
                'void_reason' => $trimmedReason,
                'void_authorized_by' => $authorizer->id,
                'voided_at' => $now,
            ])->save();

            Payment::query()
                ->where('order_id', $lockedOrder->id)
                ->where('status', PaymentStatus::Paid->value)
                ->update(['status' => PaymentStatus::Refunded->value]);

            $this->auditLogService->record(
                action: 'order.void',
                actorId: $actorId,
                authorizedById: $authorizer->id,
                auditable: $lockedOrder,
                reason: $trimmedReason,
                metadata: [
                    'order_number' => $lockedOrder->order_number,
                    'previous_status' => $previousStatus,
                    'total_amount' => $lockedOrder->total_amount,
                ],
            );

            return $lockedOrder->fresh(['payments']) ?? $lockedOrder;
        });
    }
}
