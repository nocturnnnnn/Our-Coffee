<?php

declare(strict_types=1);

use App\Enums\OrderChannel;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Models\AppSetting;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Ingredient;
use App\Models\KioskDevice;
use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\User;
use App\Services\OrderService;

test('non-admin roles are forbidden from analytics, reports, staff, audit logs, and settings', function () {
    $kasir = User::factory()->kasir()->create();
    $barista = User::factory()->barista()->create();

    $this->actingAs($kasir)->getJson(route('admin.dashboard.metrics'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.reports.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.reports.export'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.staff.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.audit-logs.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('admin.settings.index'))->assertForbidden();

    $this->actingAs($barista)->get(route('admin.reports.index'))->assertForbidden();
    $this->actingAs($barista)->get(route('admin.staff.index'))->assertForbidden();
});

test('dashboard metrics, reports, and CSV export reflect settled orders and low stock accurately', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $beans = Ingredient::factory()->create([
        'current_stock' => '50.000',
        'min_stock' => '100.000',
        'cost_per_unit' => 250,
    ]);
    $menu = MenuItem::factory()->create([
        'category_id' => $category->id,
        'name' => 'Signature Latte',
        'price' => 32000,
    ]);
    MenuItemIngredient::query()->create([
        'menu_item_id' => $menu->id,
        'ingredient_id' => $beans->id,
        'quantity' => '18.000',
    ]);

    $orderService = app(OrderService::class);
    $order = $orderService->createOrder([
        'channel' => OrderChannel::Pos,
        'order_type' => OrderType::DineIn,
        'items' => [['menu_item_id' => $menu->id, 'quantity' => 2]],
    ]);
    $paid = $orderService->markPaid($order, PaymentMethod::Edc, processedById: $admin->id);

    $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();

    $metrics = $this->actingAs($admin)
        ->getJson(route('admin.dashboard.metrics', ['days' => 7]))
        ->assertOk()
        ->json();

    expect($metrics['kpis']['today_revenue'])->toBe(64000)
        ->and($metrics['kpis']['today_orders'])->toBe(1)
        ->and($metrics['kpis']['today_aov'])->toBe(64000)
        ->and($metrics['kpis']['low_stock_count'])->toBe(1)
        ->and($metrics['channelSplit']['pos_orders'])->toBe(1)
        ->and($metrics['topMenus'][0]['name'])->toBe('Signature Latte');

    $this->actingAs($admin)->get(route('admin.reports.index'))->assertOk();

    $csvResponse = $this->actingAs($admin)
        ->get(route('admin.reports.export'));

    $csvResponse->assertOk();
    $content = $csvResponse->streamedContent();
    expect($content)->toContain($paid->order_number)
        ->and($content)->toContain('Order Number');
});

test('admin can manage staff accounts, update PINs, and filter audit logs', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('admin.staff.index'))->assertOk();

    $this->actingAs($admin)->post(route('admin.staff.store'), [
        'name' => 'Kasir Baru',
        'email' => 'kasir.baru@ourcoffee.test',
        'password' => 'password123',
        'role' => UserRole::Kasir->value,
        'pin' => null,
        'is_active' => true,
    ])->assertRedirect();

    $staff = User::query()->where('email', 'kasir.baru@ourcoffee.test')->firstOrFail();

    $this->actingAs($admin)->patch(route('admin.staff.pin', $staff), [
        'pin' => '987654',
    ])->assertRedirect();

    expect($staff->fresh()?->verifyPin('987654'))->toBeTrue();

    // Self-demotion or self-deactivation blocked
    $this->actingAs($admin)->put(route('admin.staff.update', $admin), [
        'name' => $admin->name,
        'email' => $admin->email,
        'role' => UserRole::Kasir->value,
        'is_active' => true,
    ])->assertSessionHas('error');

    expect($admin->fresh()?->role)->toBe(UserRole::Admin);

    $this->actingAs($admin)
        ->get(route('admin.audit-logs.index', ['action' => 'staff.pin_updated']))
        ->assertOk();

    expect(AuditLog::query()->where('action', 'staff.pin_updated')->count())->toBe(1);
});

test('admin can update operational settings and manage kiosk devices', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('admin.settings.index'))->assertOk();

    $this->actingAs($admin)->put(route('admin.settings.update'), [
        'cafe_name' => 'Our Coffee Flagship',
        'cafe_address' => 'Jl. Senopati No. 1',
        'cafe_phone' => '021-999999',
        'receipt_footer' => 'Sampai jumpa lagi!',
        'kiosk_idle_timeout_seconds' => 90,
        'kiosk_idle_warning_seconds' => 75,
        'kiosk_confirmation_reset_seconds' => 10,
        'qris_expiry_seconds' => 240,
    ])->assertRedirect();

    expect(AppSetting::getValue('cafe_name'))->toBe('Our Coffee Flagship')
        ->and(AppSetting::getValue('kiosk_idle_timeout_seconds'))->toBe('90');

    $this->actingAs($admin)->post(route('admin.settings.devices.store'), [
        'name' => 'Kiosk Teras',
    ])->assertRedirect();

    $device = KioskDevice::query()->where('name', 'Kiosk Teras')->firstOrFail();
    $oldToken = $device->device_token;

    $this->actingAs($admin)->post(route('admin.settings.devices.rotate', $device))->assertRedirect();
    expect($device->fresh()?->device_token)->not->toBe($oldToken);

    $this->actingAs($admin)->patch(route('admin.settings.devices.toggle', $device))->assertRedirect();
    expect($device->fresh()?->is_active)->toBeFalse();

    $this->actingAs($admin)->delete(route('admin.settings.devices.destroy', $device))->assertRedirect();
    expect(KioskDevice::query()->find($device->id))->toBeNull();
});
