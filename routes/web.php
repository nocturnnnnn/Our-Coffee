<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DistributorController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\MenuItemController;
use App\Http\Controllers\Admin\ModifierGroupController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Display\QueueDisplayController;
use App\Http\Controllers\Kds\KdsController;
use App\Http\Controllers\Kiosk\KioskController;
use App\Http\Controllers\Pos\CashierShiftController;
use App\Http\Controllers\Pos\PosController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    $user = $request->user();

    if ($user !== null) {
        return redirect()->route($user->homeRoute());
    }

    return redirect()->route('login');
})->name('home');

Route::get('dashboard', function (Request $request) {
    $user = $request->user();

    if ($user === null) {
        return redirect()->route('login');
    }

    return redirect()->route($user->homeRoute());
})->middleware('auth')->name('dashboard');

Route::get('kiosk/pair/{token}', [KioskController::class, 'pair'])->name('kiosk.pair');

Route::middleware('kiosk.device')->prefix('kiosk')->name('kiosk.')->group(function () {
    Route::get('/', [KioskController::class, 'index'])->name('index');
    Route::get('availability', [KioskController::class, 'availability'])->name('availability');
    Route::post('checkout', [KioskController::class, 'checkout'])->name('checkout');
    Route::get('orders/{order}/qris-status', [KioskController::class, 'qrisStatus'])->name('qris.status');
    Route::post('orders/{order}/qris-regenerate', [KioskController::class, 'regenerateQris'])->name('qris.regenerate');
    Route::post('orders/{order}/qris-simulate-paid', [KioskController::class, 'simulateQrisPaid'])->name('qris.simulate-paid');
    Route::post('exit', [KioskController::class, 'verifyExitPin'])->middleware('throttle:15,1')->name('exit');
});

Route::get('display/queue', [QueueDisplayController::class, 'index'])->name('display.queue');
Route::get('display/queue/feed', [QueueDisplayController::class, 'feed'])->name('display.queue.feed');

Route::middleware(['auth', 'role:admin,kasir'])->prefix('pos')->name('pos.')->group(function () {
    Route::get('shift', [CashierShiftController::class, 'index'])->name('shift');
    Route::post('shift/open', [CashierShiftController::class, 'open'])->name('shift.open');
    Route::post('shift/close', [CashierShiftController::class, 'close'])->name('shift.close');

    Route::middleware('shift.open')->group(function () {
        Route::get('/', [PosController::class, 'index'])->name('index');
        Route::get('queue', [PosController::class, 'queue'])->name('queue');
        Route::post('orders', [PosController::class, 'storeWalkInOrder'])->name('orders.store');
        Route::post('orders/{order}/pay', [PosController::class, 'settleKioskOrder'])->name('orders.pay');
        Route::post('orders/{order}/void', [PosController::class, 'voidOrder'])->middleware('throttle:15,1')->name('orders.void');
    });
});

Route::middleware(['auth', 'role:admin,barista'])->prefix('kds')->name('kds.')->group(function () {
    Route::get('/', [KdsController::class, 'index'])->name('index');
    Route::get('tickets', [KdsController::class, 'tickets'])->name('tickets');
    Route::patch('orders/{order}/status', [KdsController::class, 'transition'])->name('orders.status');
});

Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/metrics', [DashboardController::class, 'metrics'])->name('dashboard.metrics');

    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');

    Route::get('staff', [StaffController::class, 'index'])->name('staff.index');
    Route::post('staff', [StaffController::class, 'store'])->name('staff.store');
    Route::put('staff/{staff}', [StaffController::class, 'update'])->name('staff.update');
    Route::patch('staff/{staff}/pin', [StaffController::class, 'updatePin'])->name('staff.pin');

    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::put('settings', [SettingsController::class, 'update'])->name('settings.update');
    Route::post('settings/kiosk-devices', [SettingsController::class, 'storeDevice'])->name('settings.devices.store');
    Route::patch('settings/kiosk-devices/{kioskDevice}/toggle', [SettingsController::class, 'toggleDevice'])->name('settings.devices.toggle');
    Route::post('settings/kiosk-devices/{kioskDevice}/rotate-token', [SettingsController::class, 'rotateDeviceToken'])->name('settings.devices.rotate');
    Route::delete('settings/kiosk-devices/{kioskDevice}', [SettingsController::class, 'destroyDevice'])->name('settings.devices.destroy');

    Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    Route::get('menus', [MenuItemController::class, 'index'])->name('menus.index');
    Route::post('menus', [MenuItemController::class, 'store'])->name('menus.store');
    Route::put('menus/{menuItem}', [MenuItemController::class, 'update'])->name('menus.update');
    Route::patch('menus/{menuItem}/toggle-availability', [MenuItemController::class, 'toggleAvailability'])->name('menus.toggle-availability');
    Route::put('menus/{menuItem}/recipe', [MenuItemController::class, 'updateRecipe'])->name('menus.recipe.update');
    Route::delete('menus/{menuItem}', [MenuItemController::class, 'destroy'])->name('menus.destroy');

    Route::get('modifiers', [ModifierGroupController::class, 'index'])->name('modifiers.index');
    Route::post('modifiers', [ModifierGroupController::class, 'store'])->name('modifiers.store');
    Route::put('modifiers/{modifierGroup}', [ModifierGroupController::class, 'update'])->name('modifiers.update');
    Route::delete('modifiers/{modifierGroup}', [ModifierGroupController::class, 'destroy'])->name('modifiers.destroy');
    Route::post('modifiers/{modifierGroup}/options', [ModifierGroupController::class, 'storeOption'])->name('modifiers.options.store');
    Route::put('modifiers/{modifierGroup}/options/{modifierOption}', [ModifierGroupController::class, 'updateOption'])->name('modifiers.options.update');
    Route::delete('modifiers/{modifierGroup}/options/{modifierOption}', [ModifierGroupController::class, 'destroyOption'])->name('modifiers.options.destroy');

    Route::get('distributors', [DistributorController::class, 'index'])->name('distributors.index');
    Route::post('distributors', [DistributorController::class, 'store'])->name('distributors.store');
    Route::put('distributors/{distributor}', [DistributorController::class, 'update'])->name('distributors.update');
    Route::delete('distributors/{distributor}', [DistributorController::class, 'destroy'])->name('distributors.destroy');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('inventory/ingredients', [InventoryController::class, 'storeIngredient'])->name('inventory.ingredients.store');
    Route::put('inventory/ingredients/{ingredient}', [InventoryController::class, 'updateIngredient'])->name('inventory.ingredients.update');
    Route::post('inventory/ingredients/{ingredient}/restock', [InventoryController::class, 'restock'])->name('inventory.ingredients.restock');
    Route::post('inventory/ingredients/{ingredient}/waste', [InventoryController::class, 'waste'])->name('inventory.ingredients.waste');
    Route::post('inventory/ingredients/{ingredient}/opname', [InventoryController::class, 'opname'])->name('inventory.ingredients.opname');
});

require __DIR__.'/settings.php';
