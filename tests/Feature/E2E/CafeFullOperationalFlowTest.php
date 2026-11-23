<?php

declare(strict_types=1);

use App\Enums\CashierShiftStatus;
use App\Enums\IngredientUnit;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Models\AuditLog;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Distributor;
use App\Models\Ingredient;
use App\Models\KioskDevice;
use App\Models\MenuItem;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\StockMovement;
use App\Models\User;

test('complete cafe operational flow from admin setup through kiosk, pos, bom deduction, kds, display, restock, shift close, analytics, and audit', function () {
    $admin = User::factory()->admin()->withPin('123456')->create();
    $kasir = User::factory()->kasir()->create();
    $barista = User::factory()->barista()->create();

    // 1. Admin sets up Category, Distributor, Ingredient (36g stock), MenuItem (Rp 30.000), Modifier (+Rp 5.000), BOM (18g), and KioskDevice
    $this->actingAs($admin)->post(route('admin.categories.store'), [
        'name' => 'Signature',
        'icon' => 'sparkles',
        'sort_order' => 1,
        'is_active' => true,
    ])->assertRedirect();
    $category = Category::query()->where('name', 'Signature')->firstOrFail();

    $this->actingAs($admin)->post(route('admin.distributors.store'), [
        'name' => 'Roastery Utama',
        'is_active' => true,
    ])->assertRedirect();
    $distributor = Distributor::query()->where('name', 'Roastery Utama')->firstOrFail();

    $this->actingAs($admin)->post(route('admin.inventory.ingredients.store'), [
        'name' => 'Arabica House Blend',
        'sku' => 'E2E-BEANS',
        'unit' => IngredientUnit::Gram->value,
        'current_stock' => 36,
        'min_stock' => 20,
        'cost_per_unit' => 250,
        'default_distributor_id' => $distributor->id,
        'is_active' => true,
    ])->assertRedirect();
    $beans = Ingredient::query()->where('sku', 'E2E-BEANS')->firstOrFail();

    $this->actingAs($admin)->post(route('admin.modifiers.store'), [
        'name' => 'Tambahan',
        'selection_type' => 'multiple',
        'is_required' => false,
        'min_select' => 0,
        'max_select' => 2,
        'sort_order' => 1,
    ])->assertRedirect();
    $modGroup = ModifierGroup::query()->where('name', 'Tambahan')->firstOrFail();

    $this->actingAs($admin)->post(route('admin.modifiers.options.store', $modGroup), [
        'name' => 'Extra Shot',
        'price_delta' => 5000,
        'is_default' => false,
        'is_available' => true,
        'sort_order' => 1,
    ])->assertRedirect();
    $extraShot = ModifierOption::query()->where('modifier_group_id', $modGroup->id)->firstOrFail();

    $this->actingAs($admin)->post(route('admin.menus.store'), [
        'category_id' => $category->id,
        'name' => 'Kopi Susu E2E',
        'price' => 30000,
        'is_available' => true,
        'is_active' => true,
        'sort_order' => 1,
        'modifier_group_ids' => [$modGroup->id],
    ])->assertRedirect();
    $menu = MenuItem::query()->where('name', 'Kopi Susu E2E')->firstOrFail();

    $this->actingAs($admin)->put(route('admin.menus.recipe.update', $menu), [
        'ingredients' => [
            ['ingredient_id' => $beans->id, 'quantity' => 18],
        ],
    ])->assertRedirect();

    $this->actingAs($admin)->post(route('admin.settings.devices.store'), [
        'name' => 'Kiosk Utama',
    ])->assertRedirect();
    $device = KioskDevice::query()->where('name', 'Kiosk Utama')->firstOrFail();

    // 2. Kiosk pairs, verifies availability, and places a 2-cup order (Bayar di Kasir, Rp 70.000)
    $this->actingAs($admin)->get(route('kiosk.pair', ['token' => $device->device_token]))
        ->assertRedirect(route('kiosk.index'))
        ->assertPlainCookie('kiosk_device_token', $device->device_token);
    $this->assertGuest();

    $availBefore = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->getJson(route('kiosk.availability'))
        ->assertOk()
        ->json('availability');
    expect($availBefore[$menu->id]['is_available'])->toBeTrue();

    $kioskCheckout = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.checkout'), [
            'order_type' => OrderType::DineIn->value,
            'customer_name' => 'Dina',
            'payment_method' => 'cashier',
            'items' => [[
                'menu_item_id' => $menu->id,
                'quantity' => 2,
                'notes' => 'Less ice',
                'modifier_option_ids' => [$extraShot->id],
            ]],
        ])
        ->assertCreated();

    $orderId = (int) $kioskCheckout->json('order.id');
    $order = Order::query()->findOrFail($orderId);
    expect($order->total_amount)->toBe(70000);

    // 3. Kasir opens shift (Rp 500.000), sees pending Kiosk order, and settles in Cash (Rp 100.000 -> change Rp 30.000)
    $this->actingAs($kasir)->post(route('pos.shift.open'), ['opening_cash' => 500000])->assertRedirect(route('pos.index'));

    $this->actingAs($kasir)->getJson(route('pos.queue'))
        ->assertOk()
        ->assertJsonPath('pendingKioskOrders.0.id', $orderId);

    $this->actingAs($kasir)->postJson(route('pos.orders.pay', $order), [
        'payment_method' => PaymentMethod::Cash->value,
        'cash_received' => 100000,
    ])->assertOk()
        ->assertJsonPath('order.status', OrderStatus::Paid->value)
        ->assertJsonPath('order.payment.change_amount', 30000);

    // 4. Verify atomic BOM deduction (36g -> 0g), auto sold-out, and HTTP 409 conflict on Kiosk
    expect((float) $beans->refresh()->current_stock)->toBe(0.0)
        ->and(StockMovement::query()->where('ingredient_id', $beans->id)->where('type', StockMovementType::Sale->value)->count())->toBe(1);

    $availSoldOut = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->getJson(route('kiosk.availability'))
        ->assertOk()
        ->json('availability');
    expect($availSoldOut[$menu->id]['is_available'])->toBeFalse();

    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.checkout'), [
            'order_type' => OrderType::Takeaway->value,
            'payment_method' => 'qris',
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])
        ->assertStatus(409);

    // 5. Barista processes KDS ticket (FIFO + non-default modifier flag + 1-step Undo + Public Display)
    $kdsList = $this->actingAs($barista)->getJson(route('kds.tickets'))->assertOk()->json('tickets');
    expect($kdsList)->toHaveCount(1)
        ->and($kdsList[0]['id'])->toBe($orderId)
        ->and($kdsList[0]['items'][0]['modifiers'][0]['is_default'])->toBeFalse();

    $this->actingAs($barista)->patchJson(route('kds.orders.status', $order), ['status' => OrderStatus::Preparing->value])->assertOk();
    $this->actingAs($barista)->patchJson(route('kds.orders.status', $order), ['status' => OrderStatus::Paid->value])->assertOk();
    $this->actingAs($barista)->patchJson(route('kds.orders.status', $order), ['status' => OrderStatus::Preparing->value])->assertOk();

    $this->getJson(route('display.queue.feed'))->assertOk()->assertJsonPath('preparing.0.queue_number', $order->queue_number);

    $this->actingAs($barista)->patchJson(route('kds.orders.status', $order), ['status' => OrderStatus::Ready->value])->assertOk();
    $this->getJson(route('display.queue.feed'))->assertOk()->assertJsonPath('ready.0.queue_number', $order->queue_number);

    $this->actingAs($barista)->patchJson(route('kds.orders.status', $order), ['status' => OrderStatus::Completed->value])->assertOk();

    // 6. Admin performs Stock In (1000g @ Rp 300.000) -> unit cost = 300 & Kiosk availability automatically restored
    $this->actingAs($admin)->post(route('admin.inventory.ingredients.restock', $beans), [
        'quantity' => 1000,
        'total_cost' => 300000,
        'distributor_id' => $distributor->id,
        'notes' => 'Restock E2E',
    ])->assertRedirect();

    expect($beans->refresh()->cost_per_unit)->toBe(300)
        ->and((float) $beans->current_stock)->toBe(1000.0);

    $availRestored = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->getJson(route('kiosk.availability'))
        ->assertOk()
        ->json('availability');
    expect($availRestored[$menu->id]['is_available'])->toBeTrue();

    // 7. Kasir closes shift with Rp 5.000 cash variance (expected 570.000, actual 565.000)
    $this->actingAs($kasir)->post(route('pos.shift.close'), [
        'actual_cash' => 565000,
        'variance_reason' => 'Selisih receh kasir',
    ])->assertRedirect(route('pos.shift'));

    $shift = CashierShift::query()->where('user_id', $kasir->id)->firstOrFail();
    expect($shift->status)->toBe(CashierShiftStatus::Closed)
        ->and($shift->expected_cash)->toBe(570000)
        ->and($shift->variance)->toBe(-5000)
        ->and(AuditLog::query()->where('action', 'shift.close_variance')->count())->toBe(1);

    // 8. Admin verifies Dashboard Metrics, CSV Report, and Audit Logs
    $this->actingAs($admin)->getJson(route('admin.dashboard.metrics'))
        ->assertOk()
        ->assertJsonPath('kpis.today_revenue', 70000)
        ->assertJsonPath('kpis.today_orders', 1)
        ->assertJsonPath('channelSplit.kiosk_orders', 1);

    $csv = $this->actingAs($admin)->get(route('admin.reports.export'))->assertOk()->streamedContent();
    expect($csv)->toContain($order->order_number);

    $this->actingAs($admin)->get(route('admin.audit-logs.index'))->assertOk();

    // 9. Kiosk exits safely with 6-digit Admin PIN
    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.exit'), ['pin' => '123456'])
        ->assertOk();

    expect(AuditLog::query()->where('action', 'kiosk.exit')->count())->toBe(1);
});
