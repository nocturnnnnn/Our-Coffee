<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 20)->default('open');
            $table->unsignedBigInteger('opening_cash');
            $table->unsignedBigInteger('expected_cash')->nullable();
            $table->unsignedBigInteger('actual_cash')->nullable();
            $table->bigInteger('variance')->nullable();
            $table->text('variance_reason')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashier_shifts');
    }
};
