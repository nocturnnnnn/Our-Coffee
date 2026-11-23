<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\Distributor;
use App\Models\Ingredient;
use App\Models\KioskDevice;
use App\Models\MenuItem;
use App\Models\ModifierGroup;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;

test('database seeder populates complete core domain data and relationships', function () {
    $this->seed(DatabaseSeeder::class);

    expect(config('app.timezone'))->toBe('Asia/Jakarta');

    $admin = User::query()->where('email', 'admin@ourcoffee.test')->first();
    $kasir = User::query()->where('email', 'kasir@ourcoffee.test')->first();
    $barista = User::query()->where('email', 'barista@ourcoffee.test')->first();

    expect($admin)->not->toBeNull()
        ->and($admin?->role)->toBe(UserRole::Admin)
        ->and($admin?->verifyPin('123456'))->toBeTrue()
        ->and($admin?->verifyPin('000000'))->toBeFalse()
        ->and($kasir?->role)->toBe(UserRole::Kasir)
        ->and($barista?->role)->toBe(UserRole::Barista);

    expect(KioskDevice::query()->count())->toBe(1)
        ->and(Distributor::query()->count())->toBe(3)
        ->and(Ingredient::query()->count())->toBe(12)
        ->and(StockMovement::query()->count())->toBe(12)
        ->and(Category::query()->count())->toBe(4)
        ->and(ModifierGroup::query()->count())->toBe(4)
        ->and(MenuItem::query()->count())->toBe(10);

    $kopiSusu = MenuItem::query()
        ->with(['category', 'modifierGroups.options', 'recipeItems.ingredient.defaultDistributor'])
        ->where('slug', 'kopi-susu-gula-aren')
        ->firstOrFail();

    expect($kopiSusu->price)->toBe(28000)
        ->and($kopiSusu->category->slug)->toBe('signature-coffee')
        ->and($kopiSusu->modifierGroups)->toHaveCount(4)
        ->and($kopiSusu->recipeItems)->toHaveCount(4)
        ->and($kopiSusu->recipeItems->first()?->ingredient->defaultDistributor)->not->toBeNull();

    expect(AppSetting::getValue('cafe_name'))->toBe('Our Coffee')
        ->and(AppSetting::getValue('kiosk_idle_timeout_seconds'))->toBe('60');
});
