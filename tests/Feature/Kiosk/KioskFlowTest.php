<?php

declare(strict_types=1);

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Ingredient;
use App\Models\KioskDevice;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;

test('kiosk device pairing sets device cookie, logs out staff session, and rejects invalid token', function () {
    $kasir = User::factory()->kasir()->create();
    $device = KioskDevice::factory()->create(['device_token' => 'valid-kiosk-token-123']);

    $this->get(route('kiosk.pair', ['token' => 'missing-token']))->assertNotFound();

    $response = $this->actingAs($kasir)
        ->get(route('kiosk.pair', ['token' => $device->device_token]));

    $response->assertRedirect(route('kiosk.index'));
    $response->assertPlainCookie('kiosk_device_token', $device->device_token);
    $this->assertGuest();
});

test('unpaired requests to kiosk routes are rejected with 403', function () {
    $this->get(route('kiosk.index'))->assertForbidden();
    $this->getJson(route('kiosk.availability'))->assertForbidden();
    $this->postJson(route('kiosk.checkout'), [])->assertForbidden();
    $this->postJson(route('kiosk.exit'), ['pin' => '123456'])->assertForbidden();
});

test('paired kiosk renders catalog and polls real-time availability', function () {
    $device = KioskDevice::factory()->create();
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create(['current_stock' => '50.000']);
    $menu = MenuItem::factory()->create([
        'category_id' => $category->id,
        'price' => 28000,
        'is_available' => true,
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $this->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->get(route('kiosk.index'))
        ->assertOk();

    $avail1 = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->getJson(route('kiosk.availability'))
        ->assertOk()
        ->json('availability');

    expect($avail1[$menu->id]['is_available'])->toBeTrue();

    $beans->forceFill(['current_stock' => '5.000'])->save();

    $avail2 = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->getJson(route('kiosk.availability'))
        ->assertOk()
        ->json('availability');

    expect($avail2[$menu->id]['is_available'])->toBeFalse();
});

test('kiosk cashier checkout creates pending_payment order without deducting stock yet', function () {
    $device = KioskDevice::factory()->create();
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create(['current_stock' => '100.000']);
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 28000]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $response = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.checkout'), [
            'order_type' => OrderType::DineIn->value,
            'customer_name' => 'Alya',
            'payment_method' => 'cashier',
            'items' => [
                [
                    'menu_item_id' => $menu->id,
                    'quantity' => 2,
                    'notes' => 'Less ice',
                ],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('order.status', OrderStatus::PendingPayment->value)
        ->assertJsonPath('order.total_amount', 56000)
        ->assertJsonPath('payment', null);

    $order = Order::query()->findOrFail($response->json('order.id'));
    expect($order->channel)->toBe(OrderChannel::Kiosk)
        ->and($order->kiosk_device_id)->toBe($device->id)
        ->and((float) $beans->refresh()->current_stock)->toBe(100.0);
});

test('kiosk qris checkout supports polling, regeneration, simulated settlement, and atomic stock deduction', function () {
    $device = KioskDevice::factory()->create();
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create(['current_stock' => '100.000']);
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 30000]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $group = ModifierGroup::factory()->create();
    $extraShot = ModifierOption::factory()->create([
        'modifier_group_id' => $group->id,
        'name' => 'Extra Shot',
        'price_delta' => 5000,
    ]);

    $checkout = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.checkout'), [
            'order_type' => OrderType::Takeaway->value,
            'payment_method' => 'qris',
            'items' => [
                [
                    'menu_item_id' => $menu->id,
                    'quantity' => 1,
                    'modifier_option_ids' => [$extraShot->id],
                ],
            ],
        ]);

    $checkout->assertCreated()
        ->assertJsonPath('order.total_amount', 35000)
        ->assertJsonPath('payment.method', PaymentMethod::Qris->value)
        ->assertJsonPath('payment.status', PaymentStatus::Pending->value);

    $orderId = (int) $checkout->json('order.id');
    $firstPaymentId = (int) $checkout->json('payment.id');

    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->getJson(route('kiosk.qris.status', ['order' => $orderId]))
        ->assertOk()
        ->assertJsonPath('payment_status', PaymentStatus::Pending->value);

    $regen = $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.qris.regenerate', ['order' => $orderId]))
        ->assertOk();

    $secondPaymentId = (int) $regen->json('payment.id');
    expect($secondPaymentId)->not->toBe($firstPaymentId)
        ->and(Payment::query()->findOrFail($firstPaymentId)->status)->toBe(PaymentStatus::Expired);

    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.qris.simulate-paid', ['order' => $orderId]))
        ->assertOk()
        ->assertJsonPath('order_status', OrderStatus::Paid->value)
        ->assertJsonPath('payment_status', PaymentStatus::Paid->value);

    expect((float) $beans->refresh()->current_stock)->toBe(82.0);
});

test('kiosk checkout returns 409 conflict when stock is insufficient', function () {
    $device = KioskDevice::factory()->create();
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create(['current_stock' => '10.000']);
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'name' => 'Espresso']);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.checkout'), [
            'order_type' => OrderType::DineIn->value,
            'payment_method' => 'qris',
            'items' => [
                ['menu_item_id' => $menu->id, 'quantity' => 1],
            ],
        ])
        ->assertStatus(409)
        ->assertJsonPath('conflicts.0.menu_item_id', $menu->id);
});

test('kiosk exit requires valid 6-digit admin pin and logs audit entry', function () {
    $admin = User::factory()->admin()->withPin('246810')->create();
    $device = KioskDevice::factory()->create();

    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.exit'), ['pin' => '000000'])
        ->assertForbidden();

    $this->withCredentials()
        ->withUnencryptedCookie('kiosk_device_token', $device->device_token)
        ->postJson(route('kiosk.exit'), ['pin' => '246810'])
        ->assertOk()
        ->assertJsonPath('redirect', route('login'));

    expect(AuditLog::query()->where('action', 'kiosk.exit')->where('authorized_by', $admin->id)->count())->toBe(1);
});
