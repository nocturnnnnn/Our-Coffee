<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 32)->unique();
            $table->string('queue_number', 16);
            $table->date('queue_date');
            $table->string('channel', 20);
            $table->string('order_type', 20);
            $table->string('customer_name', 80)->nullable();
            $table->string('status', 30)->index();
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->string('discount_reason')->nullable();
            $table->foreignId('discount_authorized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('total_amount');
            $table->unsignedBigInteger('cogs_total')->default(0);
            $table->foreignId('cashier_shift_id')->nullable()->constrained('cashier_shifts')->nullOnDelete();
            $table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('kiosk_device_id')->nullable()->constrained('kiosk_devices')->nullOnDelete();
            $table->string('void_reason')->nullable();
            $table->foreignId('void_authorized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable()->index();
            $table->timestamp('preparing_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();

            $table->unique(['queue_date', 'queue_number']);
            $table->index(['status', 'paid_at']);
            $table->index(['channel', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained('menu_items')->restrictOnDelete();
            $table->string('menu_item_name', 150);
            $table->unsignedBigInteger('unit_price');
            $table->unsignedBigInteger('modifiers_total')->default(0);
            $table->unsignedBigInteger('unit_cogs')->default(0);
            $table->unsignedSmallInteger('quantity');
            $table->unsignedBigInteger('line_total');
            $table->string('notes', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('order_item_modifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('modifier_option_id')->nullable()->constrained('modifier_options')->nullOnDelete();
            $table->string('modifier_group_name', 100);
            $table->string('modifier_option_name', 100);
            $table->unsignedInteger('price_delta')->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_modifiers');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
