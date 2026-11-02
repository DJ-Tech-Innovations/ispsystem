<?php

use App\Domain\Billing\GenerateInvoices;
use App\Domain\Subscriptions\PlanChangeService;
use App\Enums\SubscriptionStatus;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\PlanChangeRequest;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;

function subscriberWithPlan(): array
{
    $customer = customer(['email' => 'sub'.uniqid().'@example.com', 'mobile' => '0917'.random_int(1000000, 9999999)]);
    $user = User::factory()->create(['email' => $customer->email, 'type' => 'subscriber']);
    $customer->update(['user_id' => $user->id]);
    $subscription = activeSubscription(['next_billing_date' => '2030-01-15', 'billing_start_date' => '2026-01-15'], $customer);

    return [$user, $subscription->fresh(['plan', 'customer'])];
}

beforeEach(function () {
    [$this->user, $this->subscription] = subscriberWithPlan();
    $this->cheaper = plan(['name' => 'Cheaper', 'monthly_price' => 500]);
    $this->faster = plan(['name' => 'Faster', 'monthly_price' => 1999]);
    $this->hidden = plan(['name' => 'Staff only', 'monthly_price' => 2500, 'is_public' => false]);
});

function requestUpgrade($test, ?string $planId = null)
{
    return $test->actingAs($test->user, 'customer')->post(route('portal.upgrade.store', $test->subscription->id), ['plan' => $planId ?? $test->faster->id]);
}

it('offers only higher, public, active plans', function () {
    $this->actingAs($this->user, 'customer')->get(route('portal.upgrade', $this->subscription->id))
        ->assertInertia(fn (AssertableInertia $p) => $p->component('portal/upgrade')->has('upgrades', 1)->where('upgrades.0.name', 'Faster')->missing('subscription.notes'));
});

it('creates a pending request and changes nothing yet', function () {
    requestUpgrade($this)->assertSessionHasNoErrors();

    expect(PlanChangeRequest::query()->sole())->status->toBe('pending')->requested_amount->toBe('1999.00')
        ->and($this->subscription->fresh())->monthly_amount->toBe('1299.00')->service_plan_id->toBe($this->subscription->service_plan_id)
        ->and(NotificationLog::query()->pluck('event')->all())->toContain('plan_change_requested', 'plan_change_staff_alert');
});

it('refuses cheaper, hidden and unknown plans', function () {
    requestUpgrade($this, $this->cheaper->id)->assertSessionHasErrors('plan');
    requestUpgrade($this, $this->hidden->id)->assertSessionHasErrors('plan');

    expect(PlanChangeRequest::query()->count())->toBe(0);
});

it('allows one open request per service', function () {
    requestUpgrade($this);
    requestUpgrade($this)->assertSessionHasErrors('plan');

    expect(PlanChangeRequest::query()->count())->toBe(1);
});

it('refuses suspended services', function () {
    $this->subscription->update(['status' => SubscriptionStatus::Suspended]);

    requestUpgrade($this)->assertSessionHasErrors('plan');
});

it('keeps customers to their own services and requests', function () {
    [$other, $theirs] = subscriberWithPlan();

    $this->actingAs($this->user, 'customer')->get(route('portal.upgrade', $theirs->id))->assertNotFound();
    $this->actingAs($this->user, 'customer')->post(route('portal.upgrade.store', $theirs->id), ['plan' => $this->faster->id])->assertNotFound();

    $this->actingAs($other, 'customer')->post(route('portal.upgrade.store', $theirs->id), ['plan' => $this->faster->id])->assertSessionHasNoErrors();
    $this->actingAs($this->user, 'customer')->delete(route('portal.upgrade.cancel', PlanChangeRequest::query()->sole()->id))->assertNotFound();
    expect(PlanChangeRequest::query()->sole()->status)->toBe('pending');
});

it('lets a customer cancel and ask again', function () {
    requestUpgrade($this);
    $this->delete(route('portal.upgrade.cancel', PlanChangeRequest::query()->sole()->id))->assertSessionHasNoErrors();

    requestUpgrade($this)->assertSessionHasNoErrors();
    expect(PlanChangeRequest::query()->where('status', 'pending')->count())->toBe(1);
});

it('applies approval to the plan, price, history and next invoice only', function () {
    Carbon::setTestNow('2026-01-15 09:00:00');
    $this->subscription->update(['next_billing_date' => '2026-01-15']);
    app(GenerateInvoices::class)->run(today());
    $issued = Invoice::query()->sole();

    requestUpgrade($this);
    $this->actingAs(staff('billing'), 'web')->post(route('plan-changes.approve', PlanChangeRequest::query()->sole()))->assertSessionHasNoErrors();

    $subscription = $this->subscription->fresh();
    expect($subscription)->service_plan_id->toBe($this->faster->id)->monthly_amount->toBe('1999.00')
        ->and($subscription->histories()->pluck('type')->all())->toContain('plan', 'price')
        ->and($issued->fresh()->total)->toBe('1299.00')
        ->and(NotificationLog::query()->where('event', 'plan_change_approved')->exists())->toBeTrue();

    Carbon::setTestNow('2026-02-15 09:00:00');
    app(GenerateInvoices::class)->run(today());
    expect(Invoice::query()->latest('period_start')->first()->total)->toBe('1999.00');
    Carbon::setTestNow();
});

it('honours the price the customer saw if the plan price changes later', function () {
    requestUpgrade($this);
    $this->faster->update(['monthly_price' => 2999]);
    $this->actingAs(staff(), 'web')->post(route('plan-changes.approve', PlanChangeRequest::query()->sole()));

    expect($this->subscription->fresh()->monthly_amount)->toBe('1999.00');
});

it('requires a reason to reject, and shows it to the customer', function () {
    requestUpgrade($this);
    $change = PlanChangeRequest::query()->sole();

    $this->actingAs(staff(), 'web')->post(route('plan-changes.reject', $change), ['reason' => ''])->assertSessionHasErrors('reason');
    $this->post(route('plan-changes.reject', $change), ['reason' => 'Please settle your balance first'])->assertSessionHasNoErrors();

    expect($this->subscription->fresh()->monthly_amount)->toBe('1299.00');
    $this->actingAs($this->user, 'customer')->get(route('portal.upgrade', $this->subscription->id))->assertInertia(fn (AssertableInertia $p) => $p->where('latest.decision_reason', 'Please settle your balance first'));
});

it('cannot decide a request twice or approve a stale one', function () {
    requestUpgrade($this);
    $change = PlanChangeRequest::query()->sole();
    $this->actingAs(staff(), 'web');
    $service = app(PlanChangeService::class);

    $this->subscription->update(['service_plan_id' => $this->cheaper->id]);
    expect(fn () => $service->approve($change))->toThrow(ValidationException::class);
    $this->subscription->update(['service_plan_id' => $change->from_plan_id, 'status' => SubscriptionStatus::Terminated]);
    expect(fn () => $service->approve($change))->toThrow(ValidationException::class);

    $service->reject($change, 'Closed');
    expect(fn () => $service->approve($change))->toThrow(ValidationException::class);
    expect(Subscription::query()->find($this->subscription->id)->monthly_amount)->toBe('1299.00');
});

it('limits who can see and decide requests', function () {
    requestUpgrade($this);
    $change = PlanChangeRequest::query()->sole();

    $this->actingAs(staff('technician'), 'web')->get(route('plan-changes.index'))->assertForbidden();
    $this->actingAs(staff('customer_service'), 'web')->get(route('plan-changes.index'))->assertOk();
    $this->actingAs(staff('customer_service'), 'web')->post(route('plan-changes.approve', $change))->assertForbidden();
    auth()->guard('web')->logout();
    $this->actingAs($this->user, 'customer')->post(route('plan-changes.approve', $change))->assertRedirect('/login');
});

it('badges pending requests for staff', function () {
    requestUpgrade($this);

    $this->actingAs(staff('billing'), 'web')->get(route('plan-changes.index'))->assertInertia(fn (AssertableInertia $p) => $p->where('counts.planChanges', 1)->has('changes.data', 1));
});
