<?php

namespace App\Domain\Tickets;

use App\Enums\TicketCategory;
use App\Models\Customer;
use App\Models\Ticket;
use Illuminate\Support\Str;

/**
 * Tickets from people who aren't signed in (website, Messenger). Account number plus the mobile on file is enough to
 * log a problem, and nothing about the account is ever shown back, so a wrong guess learns nothing.
 */
class GuestTicketIntake
{
    public function __construct(private TicketService $tickets) {}

    public function verify(string $reference, string $mobile): ?Customer
    {
        $customer = Customer::query()->whereRaw('upper(reference) = ?', [Str::upper(trim($reference))])->first();
        $given = substr(preg_replace('/\D/', '', $mobile), -10);

        return $customer && strlen($given) === 10 && hash_equals(substr(preg_replace('/\D/', '', (string) $customer->mobile), -10), $given) ? $customer : null;
    }

    public function open(Customer $customer, TicketCategory $category, string $description, string $source): Ticket
    {
        $ticket = $this->tickets->create([
            'customer_id' => $customer->id, 'category' => $category, 'subject' => $category->label(), 'description' => $description,
            'priority' => 'normal', 'source' => $source,
            // With exactly one live service there's no doubt which line this is about.
            'subscription_id' => ($ids = $customer->subscriptions()->where('status', 'active')->pluck('id'))->count() === 1 ? $ids->first() : null,
        ]);
        $this->tickets->alertStaff($ticket, $description);

        return $ticket;
    }
}
