<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('ingredients')->restrictOnDelete();
            $table->string('type', 20);
            $table->decimal('quantity_change', 12, 3);
            $table->decimal('stock_before', 12, 3);
            $table->decimal('stock_after', 12, 3);
            $table->unsignedInteger('unit_cost')->nullable();
            $table->unsignedBigInteger('total_cost')->nullable();
            $table->foreignId('distributor_id')->nullable()->constrained('distributors')->nullOnDelete();
            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['ingredient_id', 'created_at']);
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
