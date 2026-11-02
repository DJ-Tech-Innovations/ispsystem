<?php

use App\Domain\Installations\InstallationService;
use App\Domain\Subscriptions\SubscriptionStatusService;
use App\Enums\CustomerStatus;
use App\Enums\InstallationStatus;
use App\Enums\LeadStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\NotificationLog;
use App\Models\Subscription;
use App\Support\ReferenceNumber;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->actingAs(staff());
    $customer = customer();
    $this->subscription = Subscription::query()->create(['reference' => ReferenceNumber::next('SUB'), 'customer_id' => $customer->id, 'service_plan_id' => plan()->id, 'service_address' => 'x', 'monthly_amount' => 999]);
    $this->installs = app(InstallationService::class);
    $this->statuses = app(SubscriptionStatusService::class);
});

function completeJob($test, bool $confirm = true)
{
    $job = $test->installs->create(['subscription_id' => $test->subscription->id, 'preferred_at' => now()->addDay(), 'technician_id' => staff('technician')->id]);
    $test->installs->updateProgress($job->fresh(), InstallationStatus::InProgress, null);
    $test->installs->updateProgress($job->fresh(), InstallationStatus::Completed, 'Done');
    if ($confirm) {
        $test->installs->confirm($job->fresh());
    }

    return $job->fresh();
}

it('creating an installation does not activate the subscription', function () {
    $this->installs->create(['subscription_id' => $this->subscription->id, 'preferred_at' => now()->addDay()]);

    expect($this->subscription->fresh()->status)->toBe(SubscriptionStatus::ForInstallation)
        ->and($this->subscription->fresh()->customer->status)->toBe(CustomerStatus::ForInstallation);
});

it('blocks activation until the installation is completed and confirmed', function () {
    $job = completeJob($this, confirm: false);
    expect(fn () => $this->statuses->transition($this->subscription, SubscriptionStatus::Active))->toThrow(ValidationException::class);

    $this->installs->confirm($job);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Active);

    $subscription = $this->subscription->fresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active)
        ->and($subscription->activated_on->isToday())->toBeTrue()->and($subscription->next_billing_date)->not->toBeNull()
        ->and($subscription->customer->status)->toBe(CustomerStatus::Active);
});

it('only lets a job complete from in progress', function () {
    $job = $this->installs->create(['subscription_id' => $this->subscription->id]);

    expect(fn () => $this->installs->updateProgress($job, InstallationStatus::Completed, 'x'))->toThrow(ValidationException::class);
});

it('records every status change with actor and reason', function () {
    completeJob($this);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Active);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Suspended, 'Unpaid');

    $last = $this->subscription->histories()->where('new_value', 'suspended')->sole();
    expect($last)->old_value->toBe('active')->new_value->toBe('suspended')->reason->toBe('Unpaid')->changed_by->toBe(auth()->id())
        ->and($this->subscription->fresh()->customer->status)->toBe(CustomerStatus::Suspended)
        ->and(NotificationLog::query()->where('event', 'account_suspended')->exists())->toBeTrue();
});

it('forbids moving out of a terminated subscription', function () {
    completeJob($this);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Active);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Terminated, 'Moved away');

    expect(fn () => $this->statuses->transition($this->subscription, SubscriptionStatus::Active))->toThrow(ValidationException::class);
});

it('keeps an account active while any subscription is active', function () {
    completeJob($this);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Active);
    $customer = $this->subscription->customer;
    $second = activeSubscription([], $customer);
    $this->statuses->transition($this->subscription, SubscriptionStatus::Suspended, 'Unpaid');

    expect($second->status)->toBe(SubscriptionStatus::Active)->and($customer->fresh()->status)->toBe(CustomerStatus::Active);
});

it('warns on a duplicate mobile and allows it once confirmed', function () {
    $payload = ['type' => 'residential', 'first_name' => 'Ana', 'last_name' => 'Reyes', 'mobile' => '09170000000', 'billing_address' => 'a', 'service_address' => 'a'];

    $this->post(route('customers.store'), $payload)->assertSessionHasErrors('duplicate');
    expect(Customer::query()->count())->toBe(1);

    $this->post(route('customers.store'), [...$payload, 'confirm_duplicate' => true])->assertSessionHasNoErrors();
    expect(Customer::query()->count())->toBe(2);
});

it('does not treat a shared name as a duplicate', function () {
    $this->post(route('customers.store'), ['type' => 'residential', 'first_name' => 'Juan', 'last_name' => 'Cruz', 'mobile' => '09179999999', 'billing_address' => 'a', 'service_address' => 'a'])
        ->assertSessionHasNoErrors();
});

it('converts a lead into a customer and links them', function () {
    $lead = Lead::query()->create(['reference' => 'LD-1', 'name' => 'Lead Person', 'mobile' => '09175555555', 'status' => LeadStatus::Qualified]);

    $this->post(route('customers.store'), ['type' => 'residential', 'first_name' => 'Lead', 'last_name' => 'Person', 'mobile' => '09175555555', 'billing_address' => 'a', 'service_address' => 'a', 'lead_id' => $lead->id])->assertSessionHasNoErrors();

    expect($lead->fresh())->status->toBe(LeadStatus::Converted)->customer_id->not->toBeNull();
});

it('refuses to archive a customer with records', function () {
    $this->delete(route('customers.destroy', $this->subscription->customer))->assertSessionHas('error');

    expect(Customer::query()->count())->toBe(1);
});
