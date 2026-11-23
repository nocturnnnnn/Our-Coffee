<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;

test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});

test('staff users authenticate and redirect to their role home route', function () {
    $admin = User::factory()->admin()->create();
    $this->post(route('login.store'), [
        'email' => $admin->email,
        'password' => 'password',
    ])->assertRedirect(route('admin.dashboard', absolute: false));
    $this->assertAuthenticatedAs($admin);
    $this->post(route('logout'));

    $kasir = User::factory()->kasir()->create();
    $this->post(route('login.store'), [
        'email' => $kasir->email,
        'password' => 'password',
    ])->assertRedirect(route('pos.index', absolute: false));
    $this->assertAuthenticatedAs($kasir);
    $this->post(route('logout'));

    $barista = User::factory()->barista()->create();
    $this->post(route('login.store'), [
        'email' => $barista->email,
        'password' => 'password',
    ])->assertRedirect(route('kds.index', absolute: false));
    $this->assertAuthenticatedAs($barista);
});

test('inactive users cannot authenticate', function () {
    $user = User::factory()->kasir()->inactive()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $response->assertRedirect(route('home'));

    $this->assertGuest();
});

test('users are rate limited', function () {
    $user = User::factory()->create();

    RateLimiter::increment(md5('login'.implode('|', [$user->email, '127.0.0.1'])), amount: 5);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});
