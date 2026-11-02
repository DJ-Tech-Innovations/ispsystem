<?php

namespace App\Http\Controllers\Portal;

use App\Models\Invoice;
use App\Support\Settings;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Records come from the customer's own relations, so another customer's id is simply a 404. Drafts stay invisible. */
class BillingController extends PortalController
{
    private const INVOICE_FIELDS = ['id', 'number', 'period_start', 'period_end', 'issue_date', 'due_date', 'subtotal', 'adjustment', 'tax', 'total', 'amount_paid', 'balance', 'status', 'notes', 'void_reason'];

    public function invoices(Request $request): Response
    {
        return Inertia::render('portal/invoices', [
            'invoices' => $this->customer($request)->invoices()->where('status', '<>', 'draft')->latest('issue_date')->latest()
                ->paginate(12, ['id', 'number', 'issue_date', 'due_date', 'total', 'balance', 'status'])->withQueryString(),
        ]);
    }

    public function invoice(Request $request, string $id): Response
    {
        $invoice = $this->find($request, $id);

        return Inertia::render('portal/invoice', [
            'invoice' => $invoice->only(self::INVOICE_FIELDS),
            'items' => $invoice->items()->get(['id', 'description', 'quantity', 'unit_price', 'amount']),
            'payments' => $invoice->allocations()->with('payment:id,reference,paid_at,method,status')->get(['id', 'payment_id', 'amount']),
        ]);
    }

    public function printInvoice(Request $request, string $id): Response
    {
        $invoice = $this->find($request, $id);

        return Inertia::render('invoices/print', [
            'invoice' => [...$invoice->only(self::INVOICE_FIELDS), 'customer' => $this->billTo($request), 'items' => $invoice->items()->get(['id', 'description', 'quantity', 'unit_price', 'amount'])],
            'company' => $this->company(),
        ]);
    }

    public function payments(Request $request): Response
    {
        return Inertia::render('portal/payments', [
            'payments' => $this->customer($request)->payments()->with('allocations.invoice:id,number')->latest('paid_at')
                ->paginate(12, ['id', 'reference', 'paid_at', 'amount', 'method', 'status'])->withQueryString(),
        ]);
    }

    public function receipt(Request $request, string $id): Response
    {
        $payment = $this->customer($request)->payments()->with(['allocations.invoice:id,number', 'receiver:id,name'])->findOrFail($this->uuid($id));

        return Inertia::render('payments/receipt', [
            'payment' => [
                ...$payment->only(['id', 'reference', 'paid_at', 'amount', 'method', 'external_reference', 'status', 'reversal_reason']),
                'customer' => $this->billTo($request), 'receiver' => ['name' => $payment->receiver?->name], 'allocations' => $payment->allocations,
            ],
            'company' => $this->company(),
        ]);
    }

    private function find(Request $request, string $id): Invoice
    {
        return $this->customer($request)->invoices()->where('status', '<>', 'draft')->findOrFail($this->uuid($id));
    }

    private function billTo(Request $request): array
    {
        return $this->customer($request)->only(['name', 'reference', 'mobile', 'billing_address']);
    }

    private function company(): array
    {
        return collect(Settings::all())->only(['business.email', 'business.phone', 'business.address', 'business.tin', 'billing.tax_label', 'billing.tax_rate'])
            ->mapWithKeys(fn ($v, $k) => [str_replace('.', '_', $k) => $v])->all();
    }
}
