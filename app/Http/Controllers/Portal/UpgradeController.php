<?php

namespace App\Http\Controllers\Portal;

use App\Domain\Subscriptions\PlanChangeService;
use App\Models\PlanChangeRequest;
use App\Models\ServicePlan;
use App\Models\Subscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UpgradeController extends PortalController
{
    public function __construct(private PlanChangeService $service) {}

    public function show(Request $request, string $id): Response
    {
        $subscription = $this->subscription($request, $id);
        $card = fn (ServicePlan $plan) => $plan->only(['id', 'name', 'speed_description', 'description', 'monthly_price']);
        $change = fn (PlanChangeRequest $c) => [...$c->only(['id', 'reference', 'status', 'requested_amount', 'decision_reason', 'created_at']), 'plan' => $c->toPlan->name];
        $history = PlanChangeRequest::query()->with('toPlan:id,name')->where('subscription_id', $subscription->id)->latest()->limit(5)->get();

        return Inertia::render('portal/upgrade', [
            'subscription' => [...$subscription->only(['id', 'reference', 'status', 'monthly_amount', 'next_billing_date', 'service_address']), 'plan' => $card($subscription->plan)],
            'upgrades' => $this->service->upgradesFor($subscription)->map($card)->values(),
            'pending' => ($open = $history->firstWhere('status', 'pending')) ? $change($open) : null,
            'latest' => ($last = $history->first(fn ($c) => $c->status !== 'cancelled')) && $last->status !== 'pending' ? $change($last) : null,
        ]);
    }

    public function store(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['plan' => ['required', 'uuid']]);
        $this->service->request($this->subscription($request, $id), $data['plan']);

        return back()->with('success', 'Upgrade request sent');
    }

    public function cancel(Request $request, string $id): RedirectResponse
    {
        $this->service->cancel(PlanChangeRequest::query()->where('customer_id', $this->customer($request)->id)->findOrFail($this->uuid($id)));

        return back()->with('success', 'Upgrade request cancelled');
    }

    private function subscription(Request $request, string $id): Subscription
    {
        return $this->customer($request)->subscriptions()->with('plan')->findOrFail($this->uuid($id));
    }
}
