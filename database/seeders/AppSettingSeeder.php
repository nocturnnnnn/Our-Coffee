<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class AppSettingSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::query()->where('email', 'admin@ourcoffee.test')->value('id');

        $defaults = [
            'cafe_name' => 'Our Coffee',
            'cafe_address' => 'Jl. Kopi Nusantara No. 12, Jakarta Selatan',
            'cafe_phone' => '021-5550-1988',
            'receipt_footer' => 'Terima kasih telah menikmati kopi di Our Coffee!',
            'kiosk_idle_timeout_seconds' => '60',
            'kiosk_idle_warning_seconds' => '50',
            'kiosk_confirmation_reset_seconds' => '8',
            'qris_expiry_seconds' => '300',
        ];

        foreach ($defaults as $key => $value) {
            AppSetting::query()->updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'updated_by' => $adminId,
                ],
            );
        }
    }
}
