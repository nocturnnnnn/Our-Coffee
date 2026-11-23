<?php

declare(strict_types=1);

use App\Models\User;

test('guests are redirected to the login page from dashboard', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users visiting dashboard redirect to their role home', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertRedirect(route('admin.dashboard'));

    $kasir = User::factory()->kasir()->create();
    $this->actingAs($kasir)
        ->get(route('dashboard'))
        ->assertRedirect(route('pos.index'));

    $barista = User::factory()->barista()->create();
    $this->actingAs($barista)
        ->get(route('dashboard'))
        ->assertRedirect(route('kds.index'));
});
