<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_devices', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('device_token', 64)->unique();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('last_seen_at')->nullable();
            $table->foreignId('paired_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_devices');
    }
};
