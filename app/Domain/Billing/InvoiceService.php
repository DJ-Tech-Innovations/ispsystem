<?php

namespace App\Domain\Billing;

use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\InvoiceStatus;
use App\Enums\NotificationEvent;
use App\Models\Invoice;
use App\Support\Audit;
use App\Support\Money;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceService
{
    public function __construct(private NotificationDispatcher $notifications) {}

    /**
     * @param  array<string, mixed>  $header
     * @param  list<array{description: string, quantity?: mixed, unit_price: mixed}>  $items
     */
    public function create(array $header, array $items, InvoiceStatus $status = InvoiceStatus::Draft): Invoice
    {
        return DB::transaction(function () use ($header, $items, $status) {
            $invoice = new Invoice($header + ['adjustment' => '0.00']);
            $invoice->number = ReferenceNumber::next('INV');
            $invoice->status = $status;
            $invoice->created_by ??= auth()->id();
            $this->applyTotals($invoice, $items);
            $invoice->save();
            $invoice->items()->createMany($this->lines($items));

            if ($status !== InvoiceStatus::Draft) {
                $invoice->recalculate();
            }

            return $invoice;
        });
    }

    public function updateDraft(Invoice $invoice, array $header, array $items): void
    {
        $this->assertDraft($invoice);

        DB::transaction(function () use ($invoice, $header, $items) {
            $invoice->fill($header);
            $this->applyTotals($invoice, $items);
            $invoice->save();
            $invoice->items()->delete();
            $invoice->items()->createMany($this->lines($items));
        });
    }

    public function issue(Invoice $invoice): void
    {
        $this->assertDraft($invoice);

        DB::transaction(function () use ($invoice) {
            $invoice->status = InvoiceStatus::Unpaid;
            $invoice->recalculate();
            Audit::log('invoice', 'issued', "Invoice {$invoice->number} issued", $invoice);
            $this->notifyGenerated($invoice);
        });
    }

    public function void(Invoice $invoice, string $reason): void
    {
        DB::transaction(function () use ($invoice, $reason) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($invoice->status === InvoiceStatus::Void) {
                throw ValidationException::withMessages(['reason' => 'This invoice is already void.']);
            }
            if (Money::cmp($invoice->amount_paid, 0) > 0) {
                throw ValidationException::withMessages(['reason' => 'Reverse the payments on this invoice before voiding it.']);
            }

            $invoice->update(['status' => InvoiceStatus::Void, 'balance' => '0.00', 'voided_at' => now(), 'voided_by' => auth()->id(), 'void_reason' => $reason]);
            Audit::log('invoice', 'voided', "Invoice {$invoice->number} voided", $invoice, ['reason' => $reason]);
        });
    }

    public function notifyGenerated(Invoice $invoice): void
    {
        $this->notifications->send(NotificationEvent::InvoiceGenerated, $invoice->customer, [
            'invoice_number' => $invoice->number,
            'amount' => Money::format($invoice->total),
            'due_date' => $invoice->due_date->format('F j, Y'),
        ]);
    }

    private function assertDraft(Invoice $invoice): void
    {
        if ($invoice->status !== InvoiceStatus::Draft) {
            throw ValidationException::withMessages(['status' => 'Only draft invoices can be changed. Void it and create a new one instead.']);
        }
    }

    private function lines(array $items): array
    {
        return array_map(fn (array $item) => [
            'description' => $item['description'],
            'quantity' => $item['quantity'] ?? 1,
            'unit_price' => $item['unit_price'],
            'amount' => Money::mul($item['quantity'] ?? 1, $item['unit_price']),
        ], $items);
    }

    private function applyTotals(Invoice $invoice, array $items): void
    {
        $subtotal = Money::add(...array_column($this->lines($items), 'amount'));
        $taxable = Money::add($subtotal, $invoice->adjustment);
        $tax = Money::mul($taxable, bcdiv((string) Settings::get('billing.tax_rate', 0), '100', 6));
        $total = Money::add($taxable, $tax);

        if (Money::cmp($total, 0) < 0) {
            throw ValidationException::withMessages(['adjustment' => 'The adjustment can\'t make the invoice total negative.']);
        }

        $invoice->subtotal = $subtotal;
        $invoice->tax = $tax;
        $invoice->total = $total;
        $invoice->amount_paid = '0.00';
        $invoice->balance = $total;
    }
}
