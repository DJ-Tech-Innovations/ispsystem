<?php

use App\Models\ActivityLog;
use App\Models\InstallationJob;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

$manila = ['latitude' => 14.5995124, 'longitude' => 120.9842195, 'source' => 'map'];

it('saves a pin with who and how', function () use ($manila) {
    $customer = customer();
    $this->actingAs($staff = staff('customer_service'))->put(route('customers.location', $customer), $manila)->assertSessionHasNoErrors();

    expect($customer->fresh())->latitude->toBe(14.5995124)->longitude->toBe(120.9842195)->geo_source->toBe('map')->geo_tagged_by->toBe($staff->id)
        ->and(ActivityLog::query()->where('module', 'customer')->where('event', 'updated')->exists())->toBeTrue();
});

it('rejects locations outside the Philippines and swapped coordinates', function (float $lat, float $lng) {
    $customer = customer();

    $this->actingAs(staff())->put(route('customers.location', $customer), ['latitude' => $lat, 'longitude' => $lng, 'source' => 'map'])->assertSessionHasErrors();
    expect($customer->fresh()->latitude)->toBeNull();
})->with([[121.0, 14.6], [40.7, -74.0], [0.0, 0.0]]);

it('flags the pin when the service address changes, and clears the flag on re-pinning', function () use ($manila) {
    $customer = customer();
    $this->actingAs(staff());
    $this->put(route('customers.location', $customer), $manila);

    $payload = fn (string $address) => ['type' => 'residential', 'first_name' => 'Juan', 'last_name' => 'Cruz', 'mobile' => '09170000000', 'billing_address' => 'x', 'service_address' => $address];
    $this->put(route('customers.update', $customer), $payload('1 Rizal St'));
    expect($customer->fresh()->geo_stale)->toBeFalse();

    $this->put(route('customers.update', $customer), $payload('9 New St'))->assertSessionHasNoErrors();
    expect($customer->fresh()->geo_stale)->toBeTrue();

    $this->put(route('customers.location', $customer), $manila);
    expect($customer->fresh()->geo_stale)->toBeFalse();
});

it('removes a pin without touching the address', function () use ($manila) {
    $customer = customer();
    $this->actingAs(staff());
    $this->put(route('customers.location', $customer), $manila);
    $this->delete(route('customers.location.clear', $customer))->assertSessionHasNoErrors();

    expect($customer->fresh())->latitude->toBeNull()->geo_tagged_at->toBeNull()->service_address->toBe('1 Rizal St');
});

it('needs its own permissions', function () use ($manila) {
    $customer = customer();

    $this->actingAs(staff('billing'))->put(route('customers.location', $customer), $manila)->assertForbidden();
    $this->actingAs(staff('billing'))->get(route('map'))->assertForbidden();
    $this->actingAs(staff('technician'))->get(route('map'))->assertForbidden();
});

it('lets an assigned technician tag from the job, and nobody else', function () use ($manila) {
    $tech = staff('technician');
    $other = staff('technician');
    $subscription = activeSubscription();
    $job = InstallationJob::query()->create(['reference' => 'INS-1', 'customer_id' => $subscription->customer_id, 'subscription_id' => $subscription->id, 'address' => 'x', 'technician_id' => $tech->id]);
    $gps = [...$manila, 'source' => 'gps', 'accuracy' => 12.4];

    $this->actingAs($other)->put(route('installations.location', $job), $gps)->assertForbidden();
    $this->actingAs($tech)->put(route('installations.location', $job), $gps)->assertSessionHasNoErrors();

    expect($subscription->customer->fresh())->geo_source->toBe('gps')->geo_accuracy->toBe(12);
    $this->get(route('installations.show', $job))->assertInertia(fn (AssertableInertia $p) => $p->where('job.customer.latitude', 14.5995124)->where('job.customer.geo_source', 'gps')->has('job.customer.geo_tagged_at'));
});

it('maps only pinned customers and filters by status', function () use ($manila) {
    $pinned = customer();
    customer(['mobile' => '09171112222']);
    $this->actingAs(staff());
    $this->put(route('customers.location', $pinned), $manila);

    $this->get(route('map'))->assertInertia(fn (AssertableInertia $p) => $p->has('pins', 1)->where('pins.0.name', 'Juan Cruz')->where('totals.pinned', 1)->where('totals.all', 2));
    $this->get(route('map', ['status' => 'active']))->assertInertia(fn (AssertableInertia $p) => $p->has('pins', 0));
    $this->get(route('customers.index', ['location' => 'missing']))->assertInertia(fn (AssertableInertia $p) => $p->where('customers.total', 1));
});

it('never shows coordinates in the customer portal or on the website', function () use ($manila) {
    $customer = customer(['email' => 'geo@example.com']);
    $user = User::factory()->create(['email' => 'geo@example.com', 'type' => 'subscriber']);
    $customer->update(['user_id' => $user->id]);
    $this->actingAs(staff(), 'web')->put(route('customers.location', $customer), $manila);

    foreach (['/portal', '/portal/account'] as $url) {
        $this->actingAs($user, 'customer')->get($url)->assertOk()->assertDontSee('14.5995')->assertDontSee('latitude');
    }
});
