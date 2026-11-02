<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/** Demo portal login. Safe to run again on an existing demo database. */
class DemoPortalSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('DemoPortalSeeder must not run in production.');
        }

        if (User::query()->where('email', 'customer@ispsystem.test')->exists()) {
            return;
        }

        // Someone with a ticket and an active service, so every portal page has something to show.
        $customer = Customer::query()->where('status', 'active')->whereHas('tickets')->whereHas('invoices', fn ($q) => $q->where('status', 'paid'))->first();
        $user = User::query()->create(['name' => $customer->name, 'email' => 'customer@ispsystem.test', 'password' => 'password', 'type' => 'subscriber', 'email_verified_at' => now()]);
        $user->syncRoles('subscriber');
        $customer->update(['user_id' => $user->id, 'email' => 'customer@ispsystem.test']);
    }
}
