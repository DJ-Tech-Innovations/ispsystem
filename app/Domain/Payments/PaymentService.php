<?php

namespace App\Domain\Payments;

use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\NotificationEvent;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Audit;
use App\Support\Money;
use App\Support\ReferenceNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(private NotificationDispatcher $notifications) {}

    /** One payment applied to one invoice (the MVP workflow), stored through allocations so splits can come later. */
    public function record(Invoice $invoice, array $data): Payment
    {
        return DB::transaction(function () use ($invoice, $data) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if (! $invoice->isCollectible()) {
                throw ValidationException::withMessages(['amount' => "A {$invoice->status->label()} invoice can't take payments."]);
            }
            if (Money::cmp($data['amount'], 0) <= 0) {
                throw ValidationException::withMessages(['amount' => 'Enter an amount above zero.']);
            }
            if (Money::cmp($data['amount'], $invoice->balance) > 0) {
                throw ValidationException::withMessages(['amount' => 'The amount is more than the outstanding balance of '.Money::format($invoice->balance).'.']);
            }

            $payment = Payment::query()->create([
                'reference' => ReferenceNumber::next('PAY'),
                'customer_id' => $invoice->customer_id,
                'received_by' => auth()->id(),
                'status' => PaymentStatus::Confirmed,
                ...collect($data)->only(['paid_at', 'amount', 'method', 'external_reference', 'notes', 'proof_path', 'proof_name'])->all(),
            ]);
            $payment->allocations()->create(['invoice_id' => $invoice->id, 'amount' => $data['amount']]);
            $invoice->recalculate();

            $this->notifications->send(NotificationEvent::PaymentReceived, $invoice->customer, [
                'payment_reference' => $payment->reference,
                'invoice_number' => $invoice->number,
                'amount' => Money::format($payment->amount),
                'balance' => Money::format($invoice->balance),
            ]);

            return $payment;
        });
    }

    public function reverse(Payment $payment, string $reason): void
    {
        DB::transaction(function () use ($payment, $reason) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($payment->status === PaymentStatus::Reversed) {
                throw ValidationException::withMessages(['reason' => 'This payment was already reversed.']);
            }

            $payment->update(['status' => PaymentStatus::Reversed, 'reversed_at' => now(), 'reversed_by' => auth()->id(), 'reversal_reason' => $reason]);
            $payment->allocations()->with('invoice')->get()->each(fn ($allocation) => $allocation->invoice->recalculate());
            Audit::log('payment', 'reversed', "Payment {$payment->reference} reversed", $payment, ['reason' => $reason, 'amount' => $payment->amount]);
        });
    }
}
