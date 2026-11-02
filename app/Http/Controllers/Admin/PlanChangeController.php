<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Subscriptions\PlanChangeService;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PlanChangeRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanChangeController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', 'pending');
        $changes = PlanChangeRequest::query()
            ->with(['customer:id,reference,first_name,last_name,organization_name', 'subscription:id,reference,next_billing_date', 'fromPlan:id,name,speed_description', 'toPlan:id,name,speed_description', 'decider:id,name'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()->paginate($request->integer('per_page', 25))->withQueryString();

        // An unpaid balance is staff's call, so it's shown next to the decision.
        $balances = Invoice::query()->whereIn('customer_id', $changes->pluck('customer_id'))->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])
            ->selectRaw('customer_id, sum(balance) as balance')->groupBy('customer_id')->pluck('balance', 'customer_id');

        return Inertia::render('plan-changes/index', ['changes' => $changes, 'balances' => $balances, 'filters' => ['status' => $status]]);
    }

    public function approve(PlanChangeRequest $change, PlanChangeService $service): RedirectResponse
    {
        $service->approve($change);

        return back()->with('success', 'Upgrade approved. Remember to change the line speed on your network.');
    }

    public function reject(Request $request, PlanChangeRequest $change, PlanChangeService $service): RedirectResponse
    {
        $service->reject($change, $request->validate(['reason' => ['required', 'string', 'max:255']])['reason']);

        return back()->with('success', 'Request rejected and the customer was told why');
    }
}
