<?php

declare(strict_types=1);

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\ModifierGroup;
use App\Models\ModifierOption;
use App\Models\User;
use App\Services\OrderService;

test('barista and admin can access kds while kasir is forbidden', function () {
    $barista = User::factory()->barista()->create();
    $admin = User::factory()->admin()->create();
    $kasir = User::factory()->kasir()->create();

    $this->actingAs($barista)->get(route('kds.index'))->assertOk();
    $this->actingAs($barista)->getJson(route('kds.tickets'))->assertOk();

    $this->actingAs($admin)->get(route('kds.index'))->assertOk();

    $this->actingAs($kasir)->get(route('kds.index'))->assertForbidden();
    $this->actingAs($kasir)->getJson(route('kds.tickets'))->assertForbidden();
});

test('kds tickets endpoint returns active paid/preparing/ready orders in FIFO order with modifier default flags', function () {
    $barista = User::factory()->barista()->create();
    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 28000]);

    $group = ModifierGroup::factory()->create(['name' => 'Susu']);
    $oat = ModifierOption::factory()->create([
        'modifier_group_id' => $group->id,
        'name' => 'Oat Milk',
        'price_delta' => 8000,
        'is_default' => false,
    ]);

    $orderService = app(OrderService::class);

    $first = $orderService->createOrder([
        'channel' => OrderChannel::Pos,
        'order_type' => OrderType::DineIn,
        'customer_name' => 'First',
        'items' => [[
            'menu_item_id' => $menu->id,
            'quantity' => 1,
            'notes' => 'Less ice',
            'modifier_option_ids' => [$oat->id],
        ]],
    ]);
    $firstPaid = $orderService->markPaid($first, PaymentMethod::Edc);
    $firstPaid->forceFill(['paid_at' => now()->subMinutes(12)])->save();

    $second = $orderService->createOrder([
        'channel' => OrderChannel::Pos,
        'order_type' => OrderType::Takeaway,
        'customer_name' => 'Second',
        'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
    ]);
    $secondPaid = $orderService->markPaid($second, PaymentMethod::Edc);
    $secondPaid->forceFill(['paid_at' => now()->subMinutes(3)])->save();

    // Pending order should not appear in KDS
    $orderService->createOrder([
        'channel' => OrderChannel::Kiosk,
        'order_type' => OrderType::DineIn,
        'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
    ]);

    $response = $this->actingAs($barista)
        ->getJson(route('kds.tickets'))
        ->assertOk();

    $tickets = $response->json('tickets');
    expect($tickets)->toHaveCount(2)
        ->and($tickets[0]['id'])->toBe($firstPaid->id)
        ->and($tickets[1]['id'])->toBe($secondPaid->id)
        ->and($tickets[0]['items'][0]['modifiers'][0]['is_default'])->toBeFalse();
});

test('barista can transition ticket forward, undo 1 step, and public display reflects queue status', function () {
    $barista = User::factory()->barista()->create();
    $category = Category::factory()->create();
    $menu = MenuItem::factory()->create(['category_id' => $category->id, 'price' => 25000]);

    $orderService = app(OrderService::class);
    $order = $orderService->createOrder([
        'channel' => OrderChannel::Pos,
        'order_type' => OrderType::Takeaway,
        'customer_name' => 'Citra',
        'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
    ]);
    $paid = $orderService->markPaid($order, PaymentMethod::Edc);

    // Public display shows under preparing
    $this->get(route('display.queue'))->assertOk();
    $this->getJson(route('display.queue.feed'))
        ->assertOk()
        ->assertJsonPath('preparing.0.queue_number', $paid->queue_number)
        ->assertJsonCount(0, 'ready');

    // Paid -> Preparing -> Undo to Paid -> Preparing -> Ready
    $this->actingAs($barista)
        ->patchJson(route('kds.orders.status', $paid), ['status' => OrderStatus::Preparing->value])
        ->assertOk()
        ->assertJsonPath('ticket.status', OrderStatus::Preparing->value);

    $this->actingAs($barista)
        ->patchJson(route('kds.orders.status', $paid), ['status' => OrderStatus::Paid->value])
        ->assertOk()
        ->assertJsonPath('ticket.status', OrderStatus::Paid->value);

    $this->actingAs($barista)
        ->patchJson(route('kds.orders.status', $paid), ['status' => OrderStatus::Preparing->value])
        ->assertOk();

    $this->actingAs($barista)
        ->patchJson(route('kds.orders.status', $paid), ['status' => OrderStatus::Ready->value])
        ->assertOk()
        ->assertJsonPath('ticket.status', OrderStatus::Ready->value);

    // Public display now shows under ready
    $this->getJson(route('display.queue.feed'))
        ->assertOk()
        ->assertJsonCount(0, 'preparing')
        ->assertJsonPath('ready.0.queue_number', $paid->queue_number);

    // Complete removes from display & KDS
    $this->actingAs($barista)
        ->patchJson(route('kds.orders.status', $paid), ['status' => OrderStatus::Completed->value])
        ->assertOk()
        ->assertJsonPath('ticket.status', OrderStatus::Completed->value);

    $this->getJson(route('display.queue.feed'))
        ->assertOk()
        ->assertJsonCount(0, 'preparing')
        ->assertJsonCount(0, 'ready');
});
