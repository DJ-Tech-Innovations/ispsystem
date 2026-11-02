<?php

namespace App\Domain\Customers;

use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\NotificationEvent;
use App\Models\Customer;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PortalAccess
{
    public function __construct(private NotificationDispatcher $notifications) {}

    /**
     * The email carries no password or token, only a link to request one. Reset links then reach the customer's own
     * inbox and stay out of the notification log, which staff can read.
     */
    public function invite(Customer $customer): void
    {
        $email = strtolower((string) $customer->email);
        if ($email === '') {
            throw ValidationException::withMessages(['portal' => 'Add an email address to this customer first.']);
        }
        if (User::query()->where('email', $email)->when($customer->user_id, fn ($q) => $q->whereKeyNot($customer->user_id))->exists()) {
            throw ValidationException::withMessages(['portal' => 'Another account already uses this email address.']);
        }

        DB::transaction(function () use ($customer, $email) {
            $user = $customer->user ?? User::query()->create([
                'name' => $customer->name, 'email' => $email, 'password' => Str::password(40), 'type' => 'subscriber',
            ]);
            $user->update(['is_active' => true]);
            $user->syncRoles('subscriber');
            $customer->update(['user_id' => $user->id]);

            $this->notifications->send(NotificationEvent::PortalInvitation, $customer, [
                'activation_url' => url('/forgot-password').'?'.http_build_query(['portal' => 1, 'email' => $email]),
            ]);
            Audit::log('customer', 'portal_invited', "Portal invitation sent to {$customer->reference}", $customer);
        });
    }

    public function revoke(Customer $customer): void
    {
        $customer->user?->update(['is_active' => false]);
        Audit::log('customer', 'portal_revoked', "Portal access revoked for {$customer->reference}", $customer);
    }
}
