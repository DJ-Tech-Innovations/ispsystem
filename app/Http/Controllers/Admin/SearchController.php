<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\InstallationJob;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Subscription;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Header quick search. Each group runs only if the user can open that module. */
class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q'));
        $user = $request->user();
        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }
        $like = '%'.addcslashes($term, '%_\\').'%';
        $results = [];

        if ($user->can('customers.view')) {
            $results['Customers'] = Customer::query()->where(fn ($q) => $q->whereAny(['reference', 'first_name', 'last_name', 'organization_name', 'email', 'mobile'], 'ilike', $like)
                ->orWhereRaw("concat(first_name, ' ', last_name) ilike ?", [$like]))
                ->limit(5)->get()->map(fn ($c) => ['title' => $c->name, 'subtitle' => $c->reference.' · '.$c->mobile, 'url' => route('customers.show', $c)]);
        }
        if ($user->can('leads.view')) {
            $results['Leads'] = Lead::query()->whereAny(['reference', 'name', 'email', 'mobile'], 'ilike', $like)->limit(3)->get()
                ->map(fn ($l) => ['title' => $l->name, 'subtitle' => $l->reference.' · '.$l->status->label(), 'url' => route('leads.index', ['search' => $l->reference])]);
        }
        if ($user->can('subscriptions.view')) {
            $results['Subscriptions'] = Subscription::query()->with('customer')->whereAny(['reference', 'service_address'], 'ilike', $like)->limit(3)->get()
                ->map(fn ($s) => ['title' => $s->reference, 'subtitle' => $s->customer->name, 'url' => route('subscriptions.show', $s)]);
        }
        if ($user->can('invoices.view')) {
            $results['Invoices'] = Invoice::query()->with('customer')->where('number', 'ilike', $like)->limit(3)->get()
                ->map(fn ($i) => ['title' => $i->number, 'subtitle' => $i->customer->name.' · '.$i->status->label(), 'url' => route('invoices.show', $i)]);
        }
        if ($user->can('tickets.view')) {
            $results['Tickets'] = Ticket::query()->visibleTo($user)->with('customer')->whereAny(['number', 'subject'], 'ilike', $like)->limit(3)->get()
                ->map(fn ($t) => ['title' => $t->number.' · '.$t->subject, 'subtitle' => $t->customer->name, 'url' => route('tickets.show', $t)]);
        }
        if ($user->can('installations.view')) {
            $results['Installations'] = InstallationJob::query()->visibleTo($user)->with('customer')->where('reference', 'ilike', $like)->limit(3)->get()
                ->map(fn ($j) => ['title' => $j->reference, 'subtitle' => $j->customer->name, 'url' => route('installations.show', $j)]);
        }

        return response()->json(array_filter($results, fn ($group) => $group->isNotEmpty()));
    }
}
