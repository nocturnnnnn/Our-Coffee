<?php

declare(strict_types=1);

use App\Models\CashierShift;
use App\Models\KioskDevice;
use App\Models\User;

test('admin can access admin dashboard, kds, and pos routes', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();
    $this->actingAs($admin)->get(route('kds.index'))->assertOk();
    $this->actingAs($admin)->get(route('pos.shift'))->assertOk();
    $this->actingAs($admin)->get(route('pos.index'))->assertRedirect(route('pos.shift'));

    CashierShift::factory()->create(['user_id' => $admin->id]);
    $this->actingAs($admin)->get(route('pos.index'))->assertOk();
});

test('kasir access is enforced by role and shift.open middleware', function () {
    $kasir = User::factory()->kasir()->create();

    $this->actingAs($kasir)->get(route('admin.dashboard'))->assertForbidden();
    $this->actingAs($kasir)->get(route('kds.index'))->assertForbidden();
    $this->actingAs($kasir)->get(route('pos.shift'))->assertOk();
    $this->actingAs($kasir)->get(route('pos.index'))->assertRedirect(route('pos.shift'));

    CashierShift::factory()->create(['user_id' => $kasir->id]);
    $this->actingAs($kasir)->get(route('pos.index'))->assertOk();
});

test('barista can access kds only and is forbidden from admin and pos', function () {
    $barista = User::factory()->barista()->create();

    $this->actingAs($barista)->get(route('kds.index'))->assertOk();
    $this->actingAs($barista)->get(route('admin.dashboard'))->assertForbidden();
    $this->actingAs($barista)->get(route('pos.shift'))->assertForbidden();
    $this->actingAs($barista)->get(route('pos.index'))->assertForbidden();
});

test('inactive staff user is blocked from protected routes', function () {
    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    $this->actingAs($inactiveAdmin)->get(route('admin.dashboard'))->assertForbidden();
});

test('kiosk route requires valid active device token cookie or header', function () {
    $this->get(route('kiosk.index'))->assertForbidden();

    $inactiveDevice = KioskDevice::factory()->inactive()->create();
    $this->withUnencryptedCookie('kiosk_device_token', $inactiveDevice->device_token)
        ->get(route('kiosk.index'))
        ->assertForbidden();

    $activeDevice = KioskDevice::factory()->create();
    $this->withUnencryptedCookie('kiosk_device_token', $activeDevice->device_token)
        ->get(route('kiosk.index'))
        ->assertOk();

    expect($activeDevice->fresh()?->last_seen_at)->not->toBeNull();
});

test('public queue display is accessible without authentication', function () {
    $this->get(route('display.queue'))->assertOk();
});
