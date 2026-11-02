<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use RuntimeException;

/** Sample pins so the map has something on it. Only fills customers without a pin, and never runs in production. */
class DemoGeoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('DemoGeoSeeder must not run in production.');
        }

        mt_srand(2026);
        Customer::query()->whereNull('latitude')->orderBy('reference')->limit(34)->get()->each(function (Customer $customer) {
            $customer->forceFill([
                'latitude' => 14.6500 + mt_rand(-250, 250) / 10000, 'longitude' => 121.0400 + mt_rand(-250, 250) / 10000,
                'geo_source' => 'map', 'geo_tagged_at' => now(),
            ])->saveQuietly();
        });
    }
}
