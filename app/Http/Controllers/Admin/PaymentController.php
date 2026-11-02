<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Payments\PaymentService;
use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentRequest;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\CsvExport;
use App\Support\Search;
use App\Support\Settings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('payments/index', [
            'payments' => $this->filtered($request)->with(['customer:id,reference,first_name,last_name,organization_name', 'receiver:id,name', 'allocations.invoice:id,number'])
                ->latest('paid_at')->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('search', 'status', 'method', 'from', 'to'),
        ]);
    }

    public function store(PaymentRequest $request, PaymentService $service): RedirectResponse
    {
        $data = collect($request->validated())->except('proof', 'invoice_id')->all();
        if ($file = $request->file('proof')) {
            $data['proof_path'] = $file->store('payments', config('isp.attachments_disk'));
            $data['proof_name'] = $file->getClientOriginalName();
        }
        $service->record(Invoice::query()->findOrFail($request->input('invoice_id')), $data);

        return back()->with('success', 'Payment recorded');
    }

    public function show(Payment $payment): Response
    {
        return Inertia::render('payments/show', ['payment' => $payment->load(['customer', 'receiver:id,name', 'reverser:id,name', 'allocations.invoice:id,number,total,balance,status'])]);
    }

    public function reverse(Request $request, Payment $payment, PaymentService $service): RedirectResponse
    {
        $service->reverse($payment, $request->validate(['reason' => ['required', 'string', 'max:255']])['reason']);

        return back()->with('success', 'Payment reversed');
    }

    public function receipt(Payment $payment): Response
    {
        return Inertia::render('payments/receipt', [
            'payment' => $payment->load(['customer', 'receiver:id,name', 'allocations.invoice:id,number']),
            'company' => collect(Settings::all())->only(['business.email', 'business.phone', 'business.address', 'business.tin'])->mapWithKeys(fn ($v, $k) => [str_replace('.', '_', $k) => $v]),
        ]);
    }

    public function proof(Payment $payment): StreamedResponse
    {
        abort_unless($payment->proof_path, 404);

        return Storage::disk(config('isp.attachments_disk'))->download($payment->proof_path, $payment->proof_name);
    }

    public function export(Request $request): StreamedResponse
    {
        return CsvExport::download('payments', ['Reference', 'Customer', 'Date', 'Amount', 'Method', 'External Reference', 'Invoice', 'Received By', 'Status'],
            $this->filtered($request)->with(['customer', 'receiver:id,name', 'allocations.invoice:id,number'])->latest('paid_at'),
            fn (Payment $p) => [$p->reference, $p->customer->name, $p->paid_at->toDateTimeString(), $p->amount, $p->method->label(), $p->external_reference, $p->allocations->pluck('invoice.number')->join(', '), $p->receiver?->name, $p->status->label()]);
    }

    private function filtered(Request $request): Builder
    {
        return Payment::query()
            ->when($request->query('search'), function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->whereAny(['reference', 'external_reference'], Search::like(), $like)
                    ->orWhereHas('customer', fn ($c) => $c->whereAny(['reference', 'first_name', 'last_name', 'organization_name'], Search::like(), $like)));
            })
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('method'), fn ($q, $method) => $q->where('method', $method))
            ->when($request->date('from'), fn ($q, $from) => $q->whereDate('paid_at', '>=', $from))
            ->when($request->date('to'), fn ($q, $to) => $q->whereDate('paid_at', '<=', $to));
    }
}
