<?php

declare(strict_types=1);

use App\Models\User;

test('home redirects guests to login', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('login'));
});

test('home redirects authenticated admin to admin dashboard', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->get(route('home'));

    $response->assertRedirect(route('admin.dashboard'));
});
