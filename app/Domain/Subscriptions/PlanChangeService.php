<?php

namespace App\Domain\Subscriptions;

use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\NotificationEvent;
use App\Enums\SubscriptionStatus;
use App\Models\PlanChangeRequest;
use App\Models\ServicePlan;
use App\Models\Subscription;
use App\Support\Money;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Customers ask, staff approve. Approval changes the plan and agreed price, so the next invoice uses them. Invoices
 * already issued stay as they are, and there's no proration. The line speed itself is still set by hand on the network.
 */
class PlanChangeService
{
    public function __construct(private NotificationDispatcher $notifications) {}

    /** Higher-priced public plans than the subscriber's current one. */
    public function upgradesFor(Subscription $subscription): Collection
    {
        return ServicePlan::query()->where('is_active', true)->where('is_public', true)->whereKeyNot($subscription->service_plan_id)
            ->where('monthly_price', '>', $subscription->plan->monthly_price)->orderBy('monthly_price')->get();
    }

    public function request(Subscription $subscription, string $planId): PlanChangeRequest
    {
        if ($subscription->status !== SubscriptionStatus::Active) {
            throw ValidationException::withMessages(['plan' => 'Only active services can be upgraded.']);
        }

        $plan = $this->upgradesFor($subscription)->firstWhere('id', $planId);
        if (! $plan) {
            throw ValidationException::withMessages(['plan' => 'That plan isn\'t available as an upgrade.']);
        }

        try {
            $change = DB::transaction(function () use ($subscription, $plan) {
                $change = PlanChangeRequest::query()->create([
                    'reference' => ReferenceNumber::next('UPG'), 'customer_id' => $subscription->customer_id, 'subscription_id' => $subscription->id,
                    'from_plan_id' => $subscription->service_plan_id, 'to_plan_id' => $plan->id,
                    'current_amount' => $subscription->monthly_amount, 'requested_amount' => $plan->monthly_price,
                ]);
                $this->notifications->send(NotificationEvent::PlanChangeRequested, $subscription->customer, $this->context($change, $subscription, $plan));
                $this->notifications->sendToStaff(NotificationEvent::PlanChangeStaffAlert, $subscription->customer, (string) Settings::get('business.email'), $this->context($change, $subscription, $plan));

                return $change;
            });
        } catch (UniqueConstraintViolationException $exception) {
            if (! str_contains($exception->getMessage(), 'plan_change_one_pending')) {
                throw $exception;
            }
            throw ValidationException::withMessages(['plan' => 'You already have an upgrade request waiting.']);
        }

        return $change;
    }

    public function approve(PlanChangeRequest $change): void
    {
        DB::transaction(function () use ($change) {
            $change = PlanChangeRequest::query()->lockForUpdate()->findOrFail($change->id);
            $this->assertPending($change);
            $subscription = Subscription::query()->lockForUpdate()->findOrFail($change->subscription_id);

            if ($subscription->status !== SubscriptionStatus::Active) {
                throw ValidationException::withMessages(['reason' => 'This subscription is no longer active. Reject the request instead.']);
            }
            if ($subscription->service_plan_id !== $change->from_plan_id) {
                throw ValidationException::withMessages(['reason' => 'This subscription changed plan after the request. Reject it and ask the customer to request again.']);
            }

            $oldPlan = $change->fromPlan->name;
            $oldAmount = $subscription->monthly_amount;
            $subscription->update(['service_plan_id' => $change->to_plan_id, 'monthly_amount' => $change->requested_amount]);

            $record = fn (string $type, $old, $new) => $subscription->histories()->create([
                'type' => $type, 'old_value' => $old, 'new_value' => $new, 'reason' => "Upgrade request {$change->reference}", 'changed_by' => auth()->id(), 'created_at' => now(),
            ]);
            $record('plan', $oldPlan, $change->toPlan->name);
            if (Money::cmp($oldAmount, $change->requested_amount) !== 0) {
                $record('price', $oldAmount, $change->requested_amount);
            }

            $this->decide($change, 'approved');
            $this->notifications->send(NotificationEvent::PlanChangeApproved, $change->customer, $this->context($change, $subscription, $change->toPlan));
        });
    }

    public function reject(PlanChangeRequest $change, string $reason): void
    {
        DB::transaction(function () use ($change, $reason) {
            $change = PlanChangeRequest::query()->lockForUpdate()->findOrFail($change->id);
            $this->assertPending($change);
            $this->decide($change, 'rejected', $reason);
            $this->notifications->send(NotificationEvent::PlanChangeRejected, $change->customer, [...$this->context($change, $change->subscription, $change->toPlan), 'reason' => $reason]);
        });
    }

    public function cancel(PlanChangeRequest $change): void
    {
        DB::transaction(function () use ($change) {
            $change = PlanChangeRequest::query()->lockForUpdate()->findOrFail($change->id);
            $this->assertPending($change);
            $change->update(['status' => 'cancelled', 'decided_at' => now()]);
        });
    }

    private function decide(PlanChangeRequest $change, string $status, ?string $reason = null): void
    {
        $change->update(['status' => $status, 'decision_reason' => $reason, 'decided_by' => auth()->id(), 'decided_at' => now()]);
    }

    private function assertPending(PlanChangeRequest $change): void
    {
        if ($change->status !== 'pending') {
            throw ValidationException::withMessages(['reason' => 'This request was already handled.']);
        }
    }

    private function context(PlanChangeRequest $change, Subscription $subscription, ServicePlan $plan): array
    {
        return [
            'request_reference' => $change->reference, 'plan_name' => $plan->name, 'plan_speed' => $plan->speed_description,
            'new_amount' => Money::format($change->requested_amount), 'next_billing_date' => $subscription->next_billing_date?->format('F j, Y') ?? 'your next bill',
        ];
    }
}
