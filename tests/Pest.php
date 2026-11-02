<?php

use App\Enums\CustomerStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Customer;
use App\Models\ServicePlan;
use App\Models\Subscription;
use App\Models\User;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    Settings::flush();
    Bus::fake();
})->in('Feature');

function staff(string $role = 'owner'): User
{
    return tap(User::factory()->create(), fn (User $user) => $user->syncRoles($role));
}

function customer(array $attributes = []): Customer
{
    return Customer::query()->create([
        'reference' => ReferenceNumber::next('CUS', yearly: false), 'first_name' => 'Juan', 'last_name' => 'Cruz', 'mobile' => '09170000000',
        'email' => 'juan@example.com', 'billing_address' => '1 Rizal St', 'service_address' => '1 Rizal St', 'registered_on' => today(),
        'status' => CustomerStatus::Registered, 'type' => 'residential', ...$attributes,
    ]);
}

function plan(array $attributes = []): ServicePlan
{
    return ServicePlan::query()->create(['name' => 'Home Plus', 'code' => 'P'.uniqid(), 'speed_description' => '50 Mbps', 'monthly_price' => 1299, 'installation_fee' => 0, ...$attributes]);
}

function activeSubscription(array $attributes = [], ?Customer $customer = null): Subscription
{
    $customer ??= customer();
    $plan = plan();

    return Subscription::query()->create([
        'reference' => ReferenceNumber::next('SUB'), 'customer_id' => $customer->id, 'service_plan_id' => $plan->id, 'service_address' => '1 Rizal St',
        'monthly_amount' => '1299.00', 'status' => SubscriptionStatus::Active, 'activated_on' => '2026-01-15', 'billing_start_date' => '2026-01-15', 'next_billing_date' => '2026-01-15', ...$attributes,
    ]);
}
