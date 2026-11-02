<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Type-ahead data for the customer picker used on subscription, ticket and invoice forms. */
class LookupController extends Controller
{
    public function customers(Request $request): JsonResponse
    {
        abort_unless($request->user()->canAny(['customers.view', 'subscriptions.create', 'tickets.create', 'invoices.create']), 403);
        $like = '%'.addcslashes(trim((string) $request->query('q')), '%_\\').'%';

        $customers = Customer::query()
            ->with(['subscriptions' => fn ($q) => $q->with('plan:id,name')->select('id', 'customer_id', 'reference', 'service_plan_id', 'service_address', 'status', 'monthly_amount')])
            ->where(fn ($q) => $q->whereAny(['reference', 'first_name', 'last_name', 'organization_name', 'mobile'], 'ilike', $like)
                ->orWhereRaw("concat(first_name, ' ', last_name) ilike ?", [$like]))
            ->orderBy('last_name')->limit(15)->get();

        return response()->json($customers->map(fn ($c) => [
            'id' => $c->id, 'name' => $c->name, 'reference' => $c->reference, 'service_address' => $c->service_address,
            'subscriptions' => $c->subscriptions->map(fn ($s) => [
                'id' => $s->id, 'reference' => $s->reference, 'plan' => $s->plan?->name, 'address' => $s->service_address, 'status' => $s->status->value,
            ]),
        ]));
    }
}
