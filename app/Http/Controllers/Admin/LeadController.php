<?php

namespace App\Http\Controllers\Admin;

use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\LeadRequest;
use App\Models\Lead;
use App\Models\ServicePlan;
use App\Models\User;
use App\Support\Audit;
use App\Support\CsvExport;
use App\Support\ReferenceNumber;
use App\Support\Search;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $view = $request->query('view', 'board') === 'list' ? 'list' : 'board';
        $query = $this->filtered($request)->with(['plan:id,name', 'assignee:id,name']);

        return Inertia::render('leads/index', [
            'view' => $view,
            'leads' => $view === 'list' ? $query->latest()->paginate($request->integer('per_page', 25))->withQueryString() : null,
            // The board shows the open pipeline plus the latest closed cards in each outcome column.
            'board' => $view === 'board' ? $query->latest()->limit(200)->get() : null,
            'filters' => $request->only('search', 'status', 'source', 'assigned_to'),
            'plans' => ServicePlan::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'monthly_price']),
            'staff' => User::query()->staff()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(LeadRequest $request): RedirectResponse
    {
        Lead::query()->create([...$request->validated(), 'reference' => ReferenceNumber::next('LD'), 'status' => LeadStatus::New, 'created_by' => $request->user()->id]);

        return back()->with('success', 'Lead added');
    }

    public function update(LeadRequest $request, Lead $lead): RedirectResponse
    {
        $lead->update($request->validated());

        return back()->with('success', 'Lead updated');
    }

    public function status(Request $request, Lead $lead): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(LeadStatus::class)->except(LeadStatus::Converted)],
            'lost_reason' => ['nullable', 'required_if:status,lost', 'string', 'max:255'],
        ]);
        abort_if($lead->status === LeadStatus::Converted, 422, 'A converted lead can\'t change status.');
        $lead->update($data);

        return back()->with('success', 'Lead moved to '.$lead->status->label());
    }

    public function destroy(Lead $lead): RedirectResponse
    {
        abort_if($lead->status === LeadStatus::Converted, 422, 'Converted leads are kept with the customer record.');
        $lead->delete();

        return back()->with('success', 'Lead deleted');
    }

    /** Hands the lead to the customer form; the customer is only linked once it has been saved. */
    public function convert(Lead $lead): RedirectResponse
    {
        abort_if($lead->status === LeadStatus::Converted, 422);
        Audit::log('lead', 'convert_started', "Started converting lead {$lead->reference}", $lead);

        return to_route('customers.index', ['from_lead' => $lead->id]);
    }

    public function export(Request $request): StreamedResponse
    {
        return CsvExport::download('leads', ['Reference', 'Name', 'Mobile', 'Email', 'Address', 'Source', 'Status', 'Assigned To', 'Follow Up', 'Created'],
            $this->filtered($request)->with('assignee:id,name')->latest(),
            fn (Lead $l) => [$l->reference, $l->name, $l->mobile, $l->email, $l->address, $l->source->label(), $l->status->label(), $l->assignee?->name, $l->follow_up_on?->toDateString(), $l->created_at->toDateString()]);
    }

    private function filtered(Request $request): Builder
    {
        return Lead::query()
            ->when($request->query('search'), fn ($q, $term) => $q->whereAny(['reference', 'name', 'email', 'mobile', 'address'], Search::like(), '%'.addcslashes($term, '%_\\').'%'))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('source'), fn ($q, $source) => $q->where('source', $source))
            ->when($request->query('assigned_to'), fn ($q, $id) => $q->where('assigned_to', $id));
    }
}
