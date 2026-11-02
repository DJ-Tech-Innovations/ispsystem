<?php

namespace App\Domain\Subscriptions;

use App\Domain\Customers\CustomerLifecycle;
use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\NotificationEvent;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionStatusService
{
    public function __construct(
        private CustomerLifecycle $lifecycle,
        private BillingCalendar $calendar,
        private NotificationDispatcher $notifications,
    ) {}

    public function transition(Subscription $subscription, SubscriptionStatus $next, ?string $reason = null, ?string $billingStart = null): void
    {
        DB::transaction(function () use ($subscription, $next, $reason, $billingStart) {
            $subscription = Subscription::query()->lockForUpdate()->findOrFail($subscription->id);
            $current = $subscription->status;

            if (! $current->canTransitionTo($next)) {
                throw ValidationException::withMessages(['status' => "A {$current->label()} subscription can't become {$next->label()}."]);
            }

            if ($next === SubscriptionStatus::Active && $current !== SubscriptionStatus::Suspended) {
                if (! $subscription->hasConfirmedInstallation()) {
                    throw ValidationException::withMessages(['status' => 'Confirm a completed installation before activating this subscription.']);
                }
                $this->startBilling($subscription, $billingStart);
            }

            $subscription->status = $next;
            $subscription->save();
            $subscription->histories()->create([
                'type' => 'status', 'old_value' => $current->value, 'new_value' => $next->value,
                'reason' => $reason, 'changed_by' => auth()->id(), 'created_at' => now(),
            ]);

            $this->lifecycle->syncFromSubscriptions($subscription->customer, $reason);

            match (true) {
                $next === SubscriptionStatus::Active => $this->notifications->send(NotificationEvent::SubscriptionActivated, $subscription->customer, [
                    'subscription_reference' => $subscription->reference,
                    'plan_name' => $subscription->plan->name,
                ]),
                $next === SubscriptionStatus::Suspended => $this->notifications->send(NotificationEvent::AccountSuspended, $subscription->customer, [
                    'subscription_reference' => $subscription->reference,
                    'reason' => $reason ?? '',
                ]),
                default => null,
            };
        });
    }

    private function startBilling(Subscription $subscription, ?string $billingStart): void
    {
        $subscription->activated_on = today();
        $start = $billingStart ? today()->parse($billingStart) : ($subscription->billing_start_date ?? today());
        $subscription->billing_start_date = $start;
        $subscription->billing_day ??= Settings::get('billing.default_day');
        $subscription->next_billing_date = $this->calendar->firstBillingDate($start, $subscription->billing_day);
    }
}
