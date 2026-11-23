<?php

declare(strict_types=1);

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StockMovementType;
use App\Exceptions\InvalidOrderTransitionException;
use App\Exceptions\InvalidPinException;
use App\Exceptions\StockConflictException;
use App\Models\AuditLog;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Ingredient;
use App\Models\KioskDevice;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\OrderService;
use App\Services\QueueNumberGenerator;
use Carbon\CarbonImmutable;

test('queue number generator increments sequentially per Asia/Jakarta day and resets daily', function () {
    $generator = app(QueueNumberGenerator::class);

    $dayOne = CarbonImmutable::create(2026, 11, 23, 10, 0, 0, 'Asia/Jakarta');
    $dayTwo = CarbonImmutable::create(2026, 11, 24, 8, 0, 0, 'Asia/Jakarta');

    $first = $generator->nextForDate($dayOne);
    expect($first['queue_number'])->toBe('A-001')
        ->and($first['order_number'])->toBe('OC-20261123-0001');

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 25000]);

    $orderService = app(OrderService::class);
    $created = $orderService->createOrder([
        'channel' => OrderChannel::Pos,
        'order_type' => OrderType::Takeaway,
        'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
    ]);

    expect($created->queue_number)->toBe('A-001');

    // Day two starts fresh at A-001
    $nextDayFirst = $generator->nextForDate($dayTwo);
    expect($nextDayFirst['queue_number'])->toBe('A-001')
        ->and($nextDayFirst['order_number'])->toBe('OC-20261124-0001');
});

test('order service handles kiosk creation, 409 stock conflict, QRIS charge, atomic BOM deduction, KDS transitions, and PIN void', function () {
    $admin = User::factory()->admin()->withPin('654321')->create();
    $kasir = User::factory()->kasir()->create();
    $shift = CashierShift::factory()->create(['user_id' => $kasir->id]);
    $device = KioskDevice::factory()->create();

    $beans = Ingredient::factory()->create([
        'name' => 'Arabica Beans',
        'current_stock' => '100.000',
        'cost_per_unit' => 250,
    ]);
    $oatMilk = Ingredient::factory()->create([
        'name' => 'Oat Milk',
        'current_stock' => '300.000',
        'cost_per_unit' => 45,
    ]);

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create([
        'category_id' => $category->id,
        'name' => 'Kopi Susu',
        'price' => 28000,
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $group = ModifierGroup::factory()->create(['name' => 'Susu']);
    $oatOption = ModifierOption::factory()->create([
        'modifier_group_id' => $group->id,
        'name' => 'Oat Milk',
        'price_delta' => 8000,
        'is_default' => false,
        'ingredient_id' => $oatMilk->id,
        'ingredient_qty' => '150.000',
    ]);

    $orderService = app(OrderService::class);

    // Stock conflict when ordering 3 portions requiring 450ml oat milk (> 300ml)
    expect(fn () => $orderService->createOrder([
        'channel' => OrderChannel::Kiosk,
        'order_type' => OrderType::DineIn,
        'kiosk_device_id' => $device->id,
        'items' => [
            [
                'menu_item_id' => $menu->id,
                'quantity' => 3,
                'modifier_option_ids' => [$oatOption->id],
            ],
        ],
    ]))->toThrow(StockConflictException::class);

    // Valid order for 2 portions: (28000 + 8000) * 2 = 72000
    $order = $orderService->createOrder([
        'channel' => OrderChannel::Kiosk,
        'order_type' => OrderType::DineIn,
        'customer_name' => 'Rafi',
        'kiosk_device_id' => $device->id,
        'items' => [
            [
                'menu_item_id' => $menu->id,
                'quantity' => 2,
                'notes' => 'Es sedikit',
                'modifier_option_ids' => [$oatOption->id],
            ],
        ],
    ]);

    expect($order->status)->toBe(OrderStatus::PendingPayment)
        ->and($order->total_amount)->toBe(72000)
        ->and($order->cogs_total)->toBe(22500);

    // Create QRIS payment and test expiry refresh
    $qrisPayment = $orderService->createQrisPayment($order);
    expect($qrisPayment->status)->toBe(PaymentStatus::Pending)
        ->and($qrisPayment->qris_payload)->toContain('OUR COFFEE');

    $qrisPayment->forceFill(['qris_expires_at' => now()->subMinute()])->save();
    expect($orderService->refreshQrisStatus($qrisPayment))->toBe(PaymentStatus::Expired);

    // Fallback: Kasir pays at POS with Cash Rp 100.000 -> change Rp 28.000
    $paidOrder = $orderService->markPaid(
        order: $order,
        method: PaymentMethod::Cash,
        cashReceived: 100000,
        processedById: $kasir->id,
        cashierShiftId: $shift->id,
    );

    $paidPayment = $paidOrder->payments->firstWhere('status', PaymentStatus::Paid);

    expect($paidOrder->status)->toBe(OrderStatus::Paid)
        ->and($paidOrder->paid_at)->not->toBeNull()
        ->and($paidPayment?->change_amount)->toBe(28000);

    // Atomic stock deduction verified
    expect((float) $beans->refresh()->current_stock)->toBe(64.0)
        ->and((float) $oatMilk->refresh()->current_stock)->toBe(0.0)
        ->and(StockMovement::query()->where('type', StockMovementType::Sale->value)->count())->toBe(2);

    // KDS forward and 1-step Undo transitions
    $preparing = $orderService->transitionStatus($paidOrder, OrderStatus::Preparing);
    expect($preparing->status)->toBe(OrderStatus::Preparing);

    $undoneToPaid = $orderService->transitionStatus($preparing, OrderStatus::Paid);
    expect($undoneToPaid->status)->toBe(OrderStatus::Paid)
        ->and($undoneToPaid->preparing_at)->toBeNull();

    $preparingAgain = $orderService->transitionStatus($undoneToPaid, OrderStatus::Preparing);
    $ready = $orderService->transitionStatus($preparingAgain, OrderStatus::Ready);
    $completed = $orderService->transitionStatus($ready, OrderStatus::Completed);
    expect($completed->status)->toBe(OrderStatus::Completed);

    // Invalid status jump rejected
    expect(fn () => $orderService->transitionStatus($completed, OrderStatus::Paid))
        ->toThrow(InvalidOrderTransitionException::class);

    // Void with invalid PIN rejected
    expect(fn () => $orderService->voidOrder($completed, 'Salah input', '000000', $kasir->id))
        ->toThrow(InvalidPinException::class);

    // Void with valid Admin PIN succeeds and writes AuditLog
    $voided = $orderService->voidOrder($completed, 'Pelanggan membatalkan pesanan', '654321', $kasir->id);
    $refundedPayment = $voided->payments->firstWhere('method', PaymentMethod::Cash);

    expect($voided->status)->toBe(OrderStatus::Voided)
        ->and($voided->void_authorized_by)->toBe($admin->id)
        ->and($refundedPayment?->status)->toBe(PaymentStatus::Refunded)
        ->and(AuditLog::query()->where('action', 'order.void')->count())->toBe(1);
});
