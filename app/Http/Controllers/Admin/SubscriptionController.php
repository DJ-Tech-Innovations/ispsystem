<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Customers\CustomerLifecycle;
use App\Domain\Subscriptions\SubscriptionStatusService;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\SubscriptionRequest;
use App\Models\PlanChangeRequest;
use App\Models\ServicePlan;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CsvExport;
use App\Support\Money;
use App\Support\ReferenceNumber;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('subscriptions/index', [
            'subscriptions' => $this->filtered($request)->with(['customer:id,reference,first_name,last_name,organization_name', 'plan:id,name'])
                ->latest()->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('search', 'status', 'plan'),
            'plans' => ServicePlan::query()->orderBy('sort_order')->get(['id', 'name', 'monthly_price', 'installation_fee', 'is_active']),
        ]);
    }

    public function store(SubscriptionRequest $request, CustomerLifecycle $lifecycle): RedirectResponse
    {
        $subscription = DB::transaction(function () use ($request, $lifecycle) {
            $subscription = Subscription::query()->create([
                ...collect($request->validated())->except('change_reason')->all(),
                'reference' => ReferenceNumber::next('SUB'),
                'status' => SubscriptionStatus::Pending,
                'deposit' => $request->input('deposit') ?: 0,
                'created_by' => $request->user()->id,
            ]);
            $subscription->histories()->create(['new_value' => 'pending', 'reason' => 'Subscription created', 'changed_by' => $request->user()->id, 'created_at' => now()]);
            $lifecycle->syncFromSubscriptions($subscription->customer);

            return $subscription;
        });

        return to_route('subscriptions.show', $subscription)->with('success', 'Subscription created');
    }

    public function show(Request $request, Subscription $subscription): Response
    {
        $user = $request->user();
        $subscription->load(['customer', 'plan', 'histories.actor:id,name']);

        return Inertia::render('subscriptions/show', [
            'subscription' => [...$subscription->toArray(), 'pending_change_count' => PlanChangeRequest::query()->where('subscription_id', $subscription->id)->where('status', 'pending')->count()],
            'installations' => $user->can('installations.view') ? $subscription->installationJobs()->visibleTo($user)->with('technician:id,name')->latest()->get() : [],
            'invoices' => $user->can('invoices.view') ? $subscription->invoices()->latest('issue_date')->limit(24)->get() : [],
            'canActivate' => $subscription->hasConfirmedInstallation(),
            'plans' => ServicePlan::query()->where('is_active', true)->orWhereKey($subscription->service_plan_id)->orderBy('sort_order')->get(['id', 'name', 'monthly_price', 'installation_fee', 'is_active']),
            'technicians' => User::query()->staff()->where('is_active', true)->role('technician')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(SubscriptionRequest $request, Subscription $subscription): RedirectResponse
    {
        $data = collect($request->validated());

        DB::transaction(function () use ($subscription, $data, $request) {
            $oldPlan = $subscription->plan->name;
            $oldAmount = $subscription->monthly_amount;
            $subscription->update($data->except('change_reason')->merge(['deposit' => $data->get('deposit') ?: 0])->all());

            $record = fn (string $type, $old, $new) => $subscription->histories()->create([
                'type' => $type, 'old_value' => $old, 'new_value' => $new, 'reason' => $data->get('change_reason'), 'changed_by' => $request->user()->id, 'created_at' => now(),
            ]);
            if ($subscription->wasChanged('service_plan_id')) {
                $record('plan', $oldPlan, $subscription->fresh('plan')->plan->name);
            }
            if (Money::cmp($oldAmount, $subscription->monthly_amount) !== 0) {
                $record('price', $oldAmount, $subscription->monthly_amount);
            }
        });

        return back()->with('success', 'Subscription updated');
    }

    public function status(Request $request, Subscription $subscription, SubscriptionStatusService $service): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'reason' => [Rule::requiredIf(in_array($request->input('status'), ['suspended', 'terminated', 'cancelled'], true)), 'nullable', 'string', 'max:255'],
            'billing_start_date' => ['nullable', 'date'],
        ]);
        $next = SubscriptionStatus::from($data['status']);

        abort_unless($request->user()->can(match ($next) {
            SubscriptionStatus::Active => 'subscriptions.activate',
            SubscriptionStatus::Suspended => 'subscriptions.suspend',
            SubscriptionStatus::Terminated, SubscriptionStatus::Cancelled => 'subscriptions.terminate',
            default => 'subscriptions.edit',
        }), 403);

        $service->transition($subscription, $next, $data['reason'] ?? null, $data['billing_start_date'] ?? null);

        return back()->with('success', 'Subscription is now '.$next->label());
    }

    public function export(Request $request): StreamedResponse
    {
        return CsvExport::download('subscriptions', ['Reference', 'Customer', 'Plan', 'Status', 'Monthly Amount', 'Activated', 'Next Billing', 'Service Address'],
            $this->filtered($request)->with(['customer', 'plan'])->latest(),
            fn (Subscription $s) => [$s->reference, $s->customer->name, $s->plan->name, $s->status->label(), $s->monthly_amount, $s->activated_on?->toDateString(), $s->next_billing_date?->toDateString(), $s->service_address]);
    }

    private function filtered(Request $request): Builder
    {
        return Subscription::query()
            ->when($request->query('search'), function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->whereAny(['reference', 'service_address'], 'ilike', $like)
                    ->orWhereHas('customer', fn ($c) => $c->whereAny(['reference', 'first_name', 'last_name', 'organization_name'], 'ilike', $like)));
            })
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('plan'), fn ($q, $plan) => $q->where('service_plan_id', $plan));
    }
}
