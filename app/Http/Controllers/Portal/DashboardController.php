<?php

namespace App\Http\Controllers\Portal;

use App\Enums\SubscriptionStatus;
use App\Models\Announcement;
use App\Models\PlanChangeRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends PortalController
{
    public const COLLECTIBLE = ['unpaid', 'partially_paid', 'overdue'];

    public function __invoke(Request $request): Response
    {
        $customer = $this->customer($request);
        $open = fn () => $customer->invoices()->whereIn('status', self::COLLECTIBLE);

        return Inertia::render('portal/dashboard', [
            'firstName' => $customer->first_name ?: $customer->name,
            'reference' => $customer->reference,
            'balance' => $open()->sum('balance'),
            'overdue' => $open()->where('status', 'overdue')->sum('balance'),
            'nextDue' => $open()->orderBy('due_date')->first(['id', 'number', 'due_date', 'balance', 'status']),
            'subscriptions' => $customer->subscriptions()->whereNotIn('status', [SubscriptionStatus::Cancelled, SubscriptionStatus::Terminated])
                ->with('plan:id,name,speed_description')->get(['id', 'reference', 'service_plan_id', 'service_address', 'status', 'monthly_amount', 'next_billing_date']),
            'pendingUpgrades' => PlanChangeRequest::query()->where('customer_id', $customer->id)->where('status', 'pending')->pluck('subscription_id'),
            'tickets' => $customer->tickets()->active()->latest()->limit(3)->get(['id', 'number', 'subject', 'status', 'created_at']),
            'announcements' => Announcement::query()->where('is_published', true)->whereIn('audience', ['all', 'customers'])
                ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
                ->latest()->limit(3)->get(['id', 'title', 'body']),
        ]);
    }
}
