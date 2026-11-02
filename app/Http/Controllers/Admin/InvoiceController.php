<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Billing\InvoiceService;
use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\InvoiceRequest;
use App\Models\Invoice;
use App\Support\CsvExport;
use App\Support\Settings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceService $service) {}

    public function index(Request $request): Response
    {
        return Inertia::render('invoices/index', [
            'invoices' => $this->filtered($request)->with('customer:id,reference,first_name,last_name,organization_name')
                ->latest('issue_date')->latest()->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('search', 'status', 'from', 'to'),
            'totals' => [
                'outstanding' => Invoice::query()->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])->sum('balance'),
                'overdue' => Invoice::query()->where('status', 'overdue')->sum('balance'),
                'draft' => Invoice::query()->where('status', 'draft')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('invoices/form', ['invoice' => null, 'dueDays' => (int) Settings::get('billing.due_days', 15), 'taxRate' => (float) Settings::get('billing.tax_rate', 0)]);
    }

    public function store(InvoiceRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $invoice = $this->service->create(collect($data)->except('items')->all(), $data['items']);

        return to_route('invoices.show', $invoice)->with('success', 'Draft invoice created');
    }

    public function show(Request $request, Invoice $invoice): Response
    {
        $invoice->load(['customer', 'subscription:id,reference', 'items', 'allocations.payment.receiver:id,name']);

        return Inertia::render('invoices/show', ['invoice' => $invoice]);
    }

    public function edit(Invoice $invoice): Response|RedirectResponse
    {
        if ($invoice->status !== InvoiceStatus::Draft) {
            return to_route('invoices.show', $invoice)->with('error', 'Only draft invoices can be edited.');
        }

        return Inertia::render('invoices/form', ['invoice' => $invoice->load(['customer', 'items']), 'dueDays' => (int) Settings::get('billing.due_days', 15), 'taxRate' => (float) Settings::get('billing.tax_rate', 0)]);
    }

    public function update(InvoiceRequest $request, Invoice $invoice): RedirectResponse
    {
        $data = $request->validated();
        $this->service->updateDraft($invoice, collect($data)->except('items')->all(), $data['items']);

        return to_route('invoices.show', $invoice)->with('success', 'Invoice updated');
    }

    public function issue(Invoice $invoice): RedirectResponse
    {
        $this->service->issue($invoice);

        return back()->with('success', 'Invoice issued to the customer');
    }

    public function void(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->service->void($invoice, $request->validate(['reason' => ['required', 'string', 'max:255']])['reason']);

        return back()->with('success', 'Invoice voided');
    }

    public function print(Invoice $invoice): Response
    {
        return Inertia::render('invoices/print', [
            'invoice' => $invoice->load(['customer', 'items']),
            'company' => collect(Settings::all())->only(['business.email', 'business.phone', 'business.address', 'business.tin', 'billing.tax_label', 'billing.tax_rate'])->mapWithKeys(fn ($v, $k) => [str_replace('.', '_', $k) => $v]),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        return CsvExport::download('invoices', ['Number', 'Customer', 'Issue Date', 'Due Date', 'Period Start', 'Period End', 'Total', 'Paid', 'Balance', 'Status'],
            $this->filtered($request)->with('customer')->latest('issue_date'),
            fn (Invoice $i) => [$i->number, $i->customer->name, $i->issue_date->toDateString(), $i->due_date->toDateString(), $i->period_start?->toDateString(), $i->period_end?->toDateString(), $i->total, $i->amount_paid, $i->balance, $i->status->label()]);
    }

    private function filtered(Request $request): Builder
    {
        return Invoice::query()
            ->when($request->query('search'), function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->where('number', 'ilike', $like)
                    ->orWhereHas('customer', fn ($c) => $c->whereAny(['reference', 'first_name', 'last_name', 'organization_name'], 'ilike', $like)));
            })
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->date('from'), fn ($q, $from) => $q->whereDate('issue_date', '>=', $from))
            ->when($request->date('to'), fn ($q, $to) => $q->whereDate('issue_date', '<=', $to));
    }
}
