<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ServicePlanRequest;
use App\Models\ServicePlan;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ServicePlanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('plans/index', [
            'plans' => ServicePlan::query()->withCount(['subscriptions as active_subscriptions_count' => fn ($q) => $q->where('status', 'active')])->orderBy('sort_order')->orderBy('monthly_price')->get(),
        ]);
    }

    public function store(ServicePlanRequest $request): RedirectResponse
    {
        ServicePlan::query()->create($request->validated());

        return back()->with('success', 'Plan created');
    }

    public function update(ServicePlanRequest $request, ServicePlan $plan): RedirectResponse
    {
        $plan->update($request->validated()); // subscribers keep their agreed price: it lives on the subscription

        return back()->with('success', 'Plan updated');
    }

    public function destroy(ServicePlan $plan): RedirectResponse
    {
        $plan->update(['is_active' => false, 'is_public' => false]);
        $plan->delete();

        return back()->with('success', 'Plan archived');
    }
}
