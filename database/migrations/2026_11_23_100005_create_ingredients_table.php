<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('sku', 50)->nullable()->unique();
            $table->string('unit', 10);
            $table->decimal('current_stock', 12, 3)->default(0);
            $table->decimal('min_stock', 12, 3)->default(0);
            $table->unsignedInteger('cost_per_unit')->default(0);
            $table->foreignId('default_distributor_id')->nullable()->constrained('distributors')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'current_stock']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
