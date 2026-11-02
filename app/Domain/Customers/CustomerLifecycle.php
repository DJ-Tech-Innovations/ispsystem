<?php

namespace App\Domain\Customers;

use App\Enums\CustomerStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Customer;
use App\Support\Audit;

class CustomerLifecycle
{
    public function changeStatus(Customer $customer, CustomerStatus $status, ?string $reason = null): void
    {
        if ($customer->status === $status) {
            return;
        }

        $old = $customer->status;
        $customer->statusHistories()->create([
            'old_status' => $old, 'new_status' => $status, 'reason' => $reason, 'changed_by' => auth()->id(), 'created_at' => now(),
        ]);
        $customer->status = $status;
        $customer->saveQuietly();

        Audit::log('customer', 'status_changed', "Customer {$customer->reference}: {$old->label()} → {$status->label()}", $customer, ['reason' => $reason]);
    }

    /** The account status follows the customer's best subscription: one active line keeps the account active. */
    public function syncFromSubscriptions(Customer $customer, ?string $reason = null): void
    {
        $statuses = $customer->subscriptions()->pluck('status');
        $has = fn (SubscriptionStatus $status) => $statuses->contains($status);

        $next = match (true) {
            $has(SubscriptionStatus::Active) => CustomerStatus::Active,
            $has(SubscriptionStatus::Suspended) => CustomerStatus::Suspended,
            $has(SubscriptionStatus::ForInstallation) => CustomerStatus::ForInstallation,
            $has(SubscriptionStatus::Pending) => CustomerStatus::Registered,
            $has(SubscriptionStatus::Terminated) => CustomerStatus::Terminated,
            default => null,
        };

        if ($next) {
            $this->changeStatus($customer, $next, $reason);
        }
    }
}
