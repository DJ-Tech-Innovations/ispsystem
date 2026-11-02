<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Customers\CustomerLifecycle;
use App\Domain\Customers\DuplicateFinder;
use App\Domain\Customers\GeoTagging;
use App\Domain\Customers\PortalAccess;
use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\CustomerStatus;
use App\Enums\InteractionType;
use App\Enums\LeadStatus;
use App\Enums\NotificationEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Requests\GeoTagRequest;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\ServicePlan;
use App\Models\User;
use App\Support\CsvExport;
use App\Support\ReferenceNumber;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $lead = $request->query('from_lead') && $request->user()->can('leads.convert')
            ? Lead::query()->whereKey($request->query('from_lead'))->where('status', '<>', LeadStatus::Converted)->first() : null;

        return Inertia::render('customers/index', [
            'customers' => $this->filtered($request)->withCount(['subscriptions'])
                ->withSum(['invoices as outstanding' => fn ($q) => $q->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])], 'balance')
                ->latest()->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('search', 'status', 'type', 'location'),
            'fromLead' => $lead?->only('id', 'name', 'email', 'mobile', 'address'),
        ]);
    }

    public function store(CustomerRequest $request, DuplicateFinder $duplicates, NotificationDispatcher $notifications): RedirectResponse
    {
        $data = $request->validated();

        if (! $request->boolean('confirm_duplicate') && ($matches = $duplicates->find($data))->isNotEmpty()) {
            throw ValidationException::withMessages(['duplicate' => 'Possible duplicate: '.$matches->map(fn ($c) => "{$c->name} ({$c->reference})")->join(', ')]);
        }

        $customer = DB::transaction(function () use ($data, $request, $notifications) {
            $customer = Customer::query()->create([...$data, 'reference' => ReferenceNumber::next('CUS', yearly: false), 'status' => CustomerStatus::Registered, 'registered_on' => today(), 'created_by' => $request->user()->id]);
            $customer->statusHistories()->create(['new_status' => CustomerStatus::Registered, 'reason' => 'Customer registered', 'changed_by' => $request->user()->id, 'created_at' => now()]);
            $customer->notificationPreference()->create();

            if ($request->filled('lead_id') && $request->user()->can('leads.convert')) {
                Lead::query()->whereKey($request->input('lead_id'))->update(['status' => LeadStatus::Converted, 'customer_id' => $customer->id, 'converted_at' => now()]);
            }

            $notifications->send(NotificationEvent::CustomerRegistered, $customer);

            return $customer;
        });

        return to_route('customers.show', $customer)->with('success', 'Customer registered');
    }

    public function show(Request $request, Customer $customer): Response
    {
        $user = $request->user();
        $customer->load(['creator:id,name', 'notificationPreference', 'user:id,is_active,last_login_at', 'geoTagger:id,name']);

        return Inertia::render('customers/show', [
            'customer' => $customer,
            'subscriptions' => $user->can('subscriptions.view') ? $customer->subscriptions()->with('plan:id,name,speed_description')->latest()->get() : [],
            'invoices' => $user->can('invoices.view') ? $customer->invoices()->latest('issue_date')->limit(50)->get() : [],
            'payments' => $user->can('payments.view') ? $customer->payments()->with('allocations.invoice:id,number')->latest('paid_at')->limit(50)->get() : [],
            'tickets' => $user->can('tickets.view') ? $customer->tickets()->visibleTo($user)->with('assignee:id,name')->latest()->limit(50)->get() : [],
            'installations' => $user->can('installations.view') ? $customer->installationJobs()->visibleTo($user)->with('technician:id,name')->latest()->get() : [],
            'interactions' => $customer->interactions()->with('author:id,name')->limit(50)->get(),
            'history' => $customer->statusHistories()->with('actor:id,name')->get(),
            'summary' => [
                'outstanding' => $user->can('invoices.view') ? $customer->invoices()->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])->sum('balance') : null,
                'paid_total' => $user->can('payments.view') ? $customer->payments()->where('status', 'confirmed')->sum('amount') : null,
                'monthly' => $user->can('subscriptions.view') ? $customer->subscriptions()->where('status', 'active')->sum('monthly_amount') : null,
            ],
            'plans' => ServicePlan::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'monthly_price', 'installation_fee']),
            'staff' => User::query()->staff()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(CustomerRequest $request, Customer $customer, DuplicateFinder $duplicates): RedirectResponse
    {
        $data = $request->validated();
        if (! $request->boolean('confirm_duplicate') && ($matches = $duplicates->find($data, $customer->id))->isNotEmpty()) {
            throw ValidationException::withMessages(['duplicate' => 'Possible duplicate: '.$matches->map(fn ($c) => "{$c->name} ({$c->reference})")->join(', ')]);
        }
        DB::transaction(function () use ($customer, $data) {
            $customer->update($data);
            // The pin may no longer match, so it's flagged for checking, not silently trusted.
            if ($customer->wasChanged('service_address') && $customer->latitude !== null) {
                $customer->update(['geo_stale' => true]);
            }
            if ($customer->user_id && $customer->wasChanged('email')) {
                $this->syncPortalEmail($customer);
            }
        });

        return back()->with('success', 'Customer updated');
    }

    /** The portal login follows the customer's email. */
    private function syncPortalEmail(Customer $customer): void
    {
        $email = strtolower((string) $customer->email);

        if ($email === '' || User::query()->where('email', $email)->whereKeyNot($customer->user_id)->exists()) {
            throw ValidationException::withMessages(['email' => 'This customer has a portal login, so the email must be filled in and unused by any other account.']);
        }
        $customer->user()->update(['email' => $email]);
    }

    public function status(Request $request, Customer $customer, CustomerLifecycle $lifecycle): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::enum(CustomerStatus::class)], 'reason' => ['required', 'string', 'max:255']]);
        DB::transaction(fn () => $lifecycle->changeStatus($customer, CustomerStatus::from($data['status']), $data['reason']));

        return back()->with('success', 'Account status updated');
    }

    public function interaction(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate(['type' => ['required', Rule::enum(InteractionType::class)], 'body' => ['required', 'string', 'max:5000']]);
        $customer->interactions()->create([...$data, 'created_by' => $request->user()->id]);

        return back()->with('success', 'Interaction logged');
    }

    public function preferences(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate(['email_enabled' => ['required', 'boolean'], 'sms_enabled' => ['required', 'boolean']]);
        $customer->notificationPreference()->updateOrCreate([], $data);

        return back()->with('success', 'Notification preferences saved');
    }

    public function location(GeoTagRequest $request, Customer $customer, GeoTagging $geo): RedirectResponse
    {
        $geo->set($customer, $request->validated());

        return back()->with('success', 'Location saved');
    }

    public function clearLocation(Customer $customer, GeoTagging $geo): RedirectResponse
    {
        $geo->clear($customer);

        return back()->with('success', 'Location removed');
    }

    public function invite(Customer $customer, PortalAccess $portal): RedirectResponse
    {
        $portal->invite($customer);

        return back()->with('success', 'Portal invitation queued');
    }

    public function revokePortal(Customer $customer, PortalAccess $portal): RedirectResponse
    {
        $portal->revoke($customer);

        return back()->with('success', 'Portal access revoked');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        if ($customer->subscriptions()->exists() || $customer->invoices()->exists() || $customer->payments()->exists() || $customer->tickets()->exists()) {
            return back()->with('error', 'This customer has service or billing records and can\'t be archived. Terminate the account instead.');
        }
        $customer->delete();

        return to_route('customers.index')->with('success', 'Customer archived');
    }

    public function export(Request $request): StreamedResponse
    {
        return CsvExport::download('customers', ['Reference', 'Name', 'Type', 'Status', 'Mobile', 'Email', 'Billing Address', 'Service Address', 'Registered'],
            $this->filtered($request)->latest(),
            fn (Customer $c) => [$c->reference, $c->name, $c->type->label(), $c->status->label(), $c->mobile, $c->email, $c->billing_address, $c->service_address, $c->registered_on->toDateString()]);
    }

    private function filtered(Request $request): Builder
    {
        return Customer::query()
            ->when($request->query('search'), function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->whereAny(['reference', 'first_name', 'last_name', 'organization_name', 'email', 'mobile', 'service_address'], 'ilike', $like)
                    ->orWhereRaw("concat(first_name, ' ', last_name) ilike ?", [$like]));
            })
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('location') === 'missing', fn ($q) => $q->whereNull('latitude'))
            ->when($request->query('location') === 'pinned', fn ($q) => $q->whereNotNull('latitude'))
            ->when($request->query('location') === 'review', fn ($q) => $q->where('geo_stale', true));
    }
}
