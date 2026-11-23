<?php

declare(strict_types=1);

use App\Enums\CashierShiftStatus;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\AuditLog;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Ingredient;
use App\Models\KioskDevice;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\User;
use App\Services\OrderService;

test('kasir must open shift before accessing pos and can view shift history', function () {
    $kasir = User::factory()->kasir()->create();

    $this->actingAs($kasir)->get(route('pos.shift'))->assertOk();
    $this->actingAs($kasir)->get(route('pos.index'))->assertRedirect(route('pos.shift'));

    $this->actingAs($kasir)
        ->post(route('pos.shift.open'), ['opening_cash' => 500000])
        ->assertRedirect(route('pos.index'));

    $shift = CashierShift::query()->where('user_id', $kasir->id)->firstOrFail();
    expect($shift->status)->toBe(CashierShiftStatus::Open)
        ->and($shift->opening_cash)->toBe(500000);

    $this->actingAs($kasir)->get(route('pos.index'))->assertOk();
});

test('kasir can poll pos queue, settle pending kiosk order in cash, and deduct BOM stock', function () {
    $kasir = User::factory()->kasir()->create();
    $shift = CashierShift::factory()->create(['user_id' => $kasir->id, 'opening_cash' => 500000]);
    $device = KioskDevice::factory()->create();

    $beans = Ingredient::factory()->create(['current_stock' => '100.000']);
    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 28000]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $kioskOrder = app(OrderService::class)->createOrder([
        'channel' => OrderChannel::Kiosk,
        'order_type' => OrderType::DineIn,
        'customer_name' => 'Bima',
        'kiosk_device_id' => $device->id,
        'items' => [['menu_item_id' => $menu->id, 'quantity' => 2]],
    ]);

    $this->actingAs($kasir)
        ->getJson(route('pos.queue'))
        ->assertOk()
        ->assertJsonPath('pendingKioskOrders.0.id', $kioskOrder->id);

    $this->actingAs($kasir)
        ->postJson(route('pos.orders.pay', $kioskOrder), [
            'payment_method' => PaymentMethod::Cash->value,
            'cash_received' => 100000,
        ])
        ->assertOk()
        ->assertJsonPath('order.status', OrderStatus::Paid->value)
        ->assertJsonPath('order.payment.change_amount', 44000);

    expect($kioskOrder->fresh()?->cashier_shift_id)->toBe($shift->id)
        ->and((float) $beans->refresh()->current_stock)->toBe(64.0);
});

test('walk-in order with manual discount requires valid admin pin and logs audit entry', function () {
    $admin = User::factory()->admin()->withPin('112233')->create();
    $kasir = User::factory()->kasir()->create();
    CashierShift::factory()->create(['user_id' => $kasir->id]);

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 30000]);

    // Wrong PIN rejected
    $this->actingAs($kasir)
        ->postJson(route('pos.orders.store'), [
            'order_type' => OrderType::Takeaway->value,
            'payment_method' => PaymentMethod::Edc->value,
            'discount_amount' => 5000,
            'discount_reason' => 'Diskon karyawan',
            'admin_pin' => '000000',
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])
        ->assertForbidden();

    // Valid PIN succeeds
    $this->actingAs($kasir)
        ->postJson(route('pos.orders.store'), [
            'order_type' => OrderType::Takeaway->value,
            'payment_method' => PaymentMethod::Edc->value,
            'discount_amount' => 5000,
            'discount_reason' => 'Kompensasi promo',
            'admin_pin' => '112233',
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])
        ->assertCreated()
        ->assertJsonPath('order.subtotal', 30000)
        ->assertJsonPath('order.discount_amount', 5000)
        ->assertJsonPath('order.total_amount', 25000);

    expect(AuditLog::query()->where('action', 'order.discount')->where('authorized_by', $admin->id)->count())->toBe(1);
});

test('voiding order requires admin pin, marks payment refunded, and logs audit', function () {
    $admin = User::factory()->admin()->withPin('778899')->create();
    $kasir = User::factory()->kasir()->create();
    CashierShift::factory()->create(['user_id' => $kasir->id]);

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 25000]);

    $created = $this->actingAs($kasir)
        ->postJson(route('pos.orders.store'), [
            'order_type' => OrderType::DineIn->value,
            'payment_method' => PaymentMethod::QrisManual->value,
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])
        ->assertCreated();

    $orderId = (int) $created->json('order.id');

    $this->actingAs($kasir)
        ->postJson(route('pos.orders.void', $orderId), [
            'reason' => 'Salah input item',
            'admin_pin' => '000000',
        ])
        ->assertForbidden();

    $this->actingAs($kasir)
        ->postJson(route('pos.orders.void', $orderId), [
            'reason' => 'Salah input item',
            'admin_pin' => '778899',
        ])
        ->assertOk()
        ->assertJsonPath('order.status', OrderStatus::Voided->value)
        ->assertJsonPath('order.payment.status', PaymentStatus::Refunded->value);

    expect(AuditLog::query()->where('action', 'order.void')->where('authorized_by', $admin->id)->count())->toBe(1);
});

test('closing shift reconciles expected cash and requires variance reason when cash differs', function () {
    $kasir = User::factory()->kasir()->create();
    $shift = CashierShift::factory()->create(['user_id' => $kasir->id, 'opening_cash' => 500000]);

    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 40000]);

    // 1 Cash sale of Rp 40.000 => expected_cash becomes 540.000
    $this->actingAs($kasir)
        ->postJson(route('pos.orders.store'), [
            'order_type' => OrderType::Takeaway->value,
            'payment_method' => PaymentMethod::Cash->value,
            'cash_received' => 50000,
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])
        ->assertCreated();

    // Missing variance reason when actual != expected
    $this->actingAs($kasir)
        ->post(route('pos.shift.close'), [
            'actual_cash' => 535000,
            'variance_reason' => '',
        ])
        ->assertSessionHasErrors('variance_reason');

    expect($shift->fresh()?->status)->toBe(CashierShiftStatus::Open);

    // Providing reason closes shift and writes audit log
    $this->actingAs($kasir)
        ->post(route('pos.shift.close'), [
            'actual_cash' => 535000,
            'variance_reason' => 'Uang kembalian kurang Rp 5.000',
        ])
        ->assertRedirect(route('pos.shift'));

    $closed = $shift->fresh();
    expect($closed?->status)->toBe(CashierShiftStatus::Closed)
        ->and($closed?->expected_cash)->toBe(540000)
        ->and($closed?->actual_cash)->toBe(535000)
        ->and($closed?->variance)->toBe(-5000)
        ->and(AuditLog::query()->where('action', 'shift.close_variance')->count())->toBe(1);
});
