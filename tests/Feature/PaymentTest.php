<?php

use App\Domain\Billing\GenerateInvoices;
use App\Domain\Billing\InvoiceService;
use App\Domain\Payments\PaymentService;
use App\Enums\InvoiceStatus;
use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Carbon::setTestNow('2026-01-15 09:00:00');
    activeSubscription();
    app(GenerateInvoices::class)->run(today());
    $this->invoice = Invoice::query()->sole();
    $this->actingAs(staff('billing'));
});
afterEach(fn () => Carbon::setTestNow());

function pay(Invoice $invoice, string $amount): Payment
{
    return app(PaymentService::class)->record($invoice, ['paid_at' => now(), 'amount' => $amount, 'method' => 'cash']);
}

it('handles a partial then a full payment', function () {
    pay($this->invoice, '300.00');
    expect($this->invoice->fresh())->status->toBe(InvoiceStatus::PartiallyPaid)->amount_paid->toBe('300.00')->balance->toBe('999.00');

    pay($this->invoice, '999.00');
    expect($this->invoice->fresh())->status->toBe(InvoiceStatus::Paid)->balance->toBe('0.00');
});

it('rejects a payment above the balance', function () {
    expect(fn () => pay($this->invoice, '1299.01'))->toThrow(ValidationException::class);
    expect(Payment::query()->count())->toBe(0);
});

it('rejects payments on paid, void and draft invoices', function () {
    pay($this->invoice, '1299.00');
    expect(fn () => pay($this->invoice->fresh(), '1.00'))->toThrow(ValidationException::class);

    $draft = app(InvoiceService::class)->create(['customer_id' => $this->invoice->customer_id, 'issue_date' => today(), 'due_date' => today()], [['description' => 'x', 'unit_price' => 10]]);
    expect(fn () => pay($draft, '1.00'))->toThrow(ValidationException::class);
});

it('restores the balance on reversal and keeps the record with an audit entry', function () {
    $payment = pay($this->invoice, '1299.00');
    app(PaymentService::class)->reverse($payment, 'Bounced transfer');

    expect($this->invoice->fresh())->status->toBe(InvoiceStatus::Unpaid)->balance->toBe('1299.00')
        ->and($payment->fresh())->status->value->toBe('reversed')->reversal_reason->toBe('Bounced transfer')
        ->and(ActivityLog::query()->where('event', 'reversed')->exists())->toBeTrue();
});

it('cannot reverse twice', function () {
    $payment = pay($this->invoice, '100.00');
    app(PaymentService::class)->reverse($payment, 'Mistake');

    expect(fn () => app(PaymentService::class)->reverse($payment, 'Again'))->toThrow(ValidationException::class);
});

it('marks a reversed late invoice overdue again', function () {
    $payment = pay($this->invoice, '1299.00');
    Carbon::setTestNow('2026-03-01');
    app(PaymentService::class)->reverse($payment, 'Bounced');

    expect($this->invoice->fresh()->status)->toBe(InvoiceStatus::Overdue);
});

it('refuses to void an invoice that has money on it', function () {
    pay($this->invoice, '100.00');

    expect(fn () => app(InvoiceService::class)->void($this->invoice->fresh(), 'nope'))->toThrow(ValidationException::class);
});

it('requires a reason to reverse over HTTP', function () {
    $payment = pay($this->invoice, '100.00');

    $this->post(route('payments.reverse', $payment), ['reason' => ''])->assertSessionHasErrors('reason');
    expect($payment->fresh()->status->value)->toBe('confirmed');
});

it('has no route that deletes or edits a payment or invoice', function () {
    $methods = collect(app('router')->getRoutes())->filter(fn ($r) => preg_match('#admin/payments#', $r->uri()))->flatMap(fn ($r) => $r->methods())->unique();

    expect($methods->contains('DELETE'))->toBeFalse()->and($methods->contains('PATCH'))->toBeFalse();
    expect(collect(app('router')->getRoutes())->contains(fn ($r) => str_starts_with($r->uri(), 'admin/invoices') && in_array('DELETE', $r->methods())))->toBeFalse();
});
