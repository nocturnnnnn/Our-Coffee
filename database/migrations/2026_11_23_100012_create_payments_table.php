<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('method', 20);
            $table->string('status', 20)->default('pending');
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('cash_received')->nullable();
            $table->unsignedBigInteger('change_amount')->nullable();
            $table->string('qris_reference', 100)->nullable()->unique();
            $table->text('qris_payload')->nullable();
            $table->timestamp('qris_expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
