<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modifier_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('selection_type', 20)->default('single');
            $table->boolean('is_required')->default(false);
            $table->unsignedTinyInteger('min_select')->default(0);
            $table->unsignedTinyInteger('max_select')->default(1);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('modifier_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modifier_group_id')->constrained('modifier_groups')->cascadeOnDelete();
            $table->string('name', 100);
            $table->unsignedInteger('price_delta')->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_available')->default(true);
            $table->foreignId('ingredient_id')->nullable()->constrained('ingredients')->nullOnDelete();
            $table->decimal('ingredient_qty', 10, 3)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('menu_item_modifier_group', function (Blueprint $table) {
            $table->foreignId('menu_item_id')->constrained('menu_items')->cascadeOnDelete();
            $table->foreignId('modifier_group_id')->constrained('modifier_groups')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->primary(['menu_item_id', 'modifier_group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_modifier_group');
        Schema::dropIfExists('modifier_options');
        Schema::dropIfExists('modifier_groups');
    }
};
