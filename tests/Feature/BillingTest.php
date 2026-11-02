<?php

use App\Domain\Billing\CollectionsService;
use App\Domain\Billing\GenerateInvoices;
use App\Domain\Billing\InvoiceService;
use App\Domain\Subscriptions\BillingCalendar;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Support\Settings;
use Carbon\Carbon;
use Illuminate\Database\QueryException;

beforeEach(fn () => Carbon::setTestNow('2026-01-15 09:00:00'));
afterEach(fn () => Carbon::setTestNow());

function bill(string $date = '2026-01-15')
{
    return app(GenerateInvoices::class)->run(Carbon::parse($date));
}

it('creates one invoice for a due subscription and advances the next billing date', function () {
    $subscription = activeSubscription();
    $run = bill();

    $invoice = Invoice::query()->sole();
    expect($run->created_count)->toBe(1)
        ->and($invoice->status)->toBe(InvoiceStatus::Unpaid)
        ->and($invoice->total)->toBe('1299.00')->and($invoice->balance)->toBe('1299.00')
        ->and($invoice->period_start->toDateString())->toBe('2026-01-15')
        ->and($invoice->period_end->toDateString())->toBe('2026-02-14')
        ->and($invoice->due_date->toDateString())->toBe('2026-01-30')
        ->and($subscription->fresh()->next_billing_date->toDateString())->toBe('2026-02-15');
});

it('never duplicates an invoice when billing is re-run', function () {
    activeSubscription();
    bill();
    $second = bill();

    expect(Invoice::query()->count())->toBe(1)->and($second->created_count)->toBe(0);
});

it('skips a period that already has an invoice even if the schedule date fell behind', function () {
    $subscription = activeSubscription();
    bill();
    $subscription->fresh()->forceFill(['next_billing_date' => '2026-01-15'])->saveQuietly();

    $run = bill();

    expect(Invoice::query()->count())->toBe(1)->and($run->skipped_count)->toBe(1)
        ->and($subscription->fresh()->next_billing_date->toDateString())->toBe('2026-02-15');
});

it('has a database constraint that rejects a duplicate period', function () {
    $subscription = activeSubscription();
    bill();
    $invoice = Invoice::query()->sole();

    expect(fn () => Invoice::query()->create([...$invoice->only(['customer_id', 'subscription_id', 'period_start', 'issue_date', 'due_date']), 'number' => 'DUP-1', 'status' => InvoiceStatus::Unpaid]))
        ->toThrow(QueryException::class);
});

it('lets a voided period be reissued', function () {
    activeSubscription();
    bill();
    $invoice = Invoice::query()->sole();
    app(InvoiceService::class)->void($invoice, 'Wrong amount');

    Invoice::query()->create([...$invoice->only(['customer_id', 'subscription_id', 'period_start', 'issue_date', 'due_date']), 'number' => 'REISSUE-1', 'status' => InvoiceStatus::Unpaid]);

    expect(Invoice::query()->count())->toBe(2);
});

it('catches up on missed months one invoice at a time', function () {
    activeSubscription();
    $run = bill('2026-03-20');

    expect($run->created_count)->toBe(3)
        ->and(Invoice::query()->orderBy('period_start')->pluck('period_start')->map->toDateString()->all())->toBe(['2026-01-15', '2026-02-15', '2026-03-15']);
});

it('does not bill terminated, cancelled, pending or not-yet-started subscriptions', function () {
    activeSubscription(['status' => SubscriptionStatus::Terminated]);
    activeSubscription(['status' => SubscriptionStatus::Cancelled]);
    activeSubscription(['status' => SubscriptionStatus::Pending]);
    activeSubscription(['billing_start_date' => '2026-02-01', 'next_billing_date' => '2026-02-01']);

    expect(bill()->created_count)->toBe(0);
});

it('follows the suspension billing setting', function () {
    activeSubscription(['status' => SubscriptionStatus::Suspended]);
    expect(bill()->created_count)->toBe(0);

    Settings::put(['billing.bill_suspended' => true]);
    expect(bill()->created_count)->toBe(1);
});

it('keeps the contracted price after the plan price changes', function () {
    $subscription = activeSubscription();
    $subscription->plan->update(['monthly_price' => 1999]);
    bill();

    expect(Invoice::query()->sole()->total)->toBe('1299.00');
});

it('charges the installation fee once, on the first invoice', function () {
    activeSubscription(['installation_fee' => '1500.00']);
    bill('2026-02-20');

    $invoices = Invoice::query()->orderBy('period_start')->get();
    expect($invoices[0]->total)->toBe('2799.00')->and($invoices[0]->items()->count())->toBe(2)
        ->and($invoices[1]->total)->toBe('1299.00');
});

it('applies tax from settings with exact decimals', function () {
    Settings::put(['billing.tax_rate' => 12]);
    activeSubscription(['monthly_amount' => '999.99']);
    bill();

    expect(Invoice::query()->sole())->tax->toBe('120.00')->total->toBe('1119.99');
});

it('clamps a billing day to the end of short months', function () {
    $calendar = app(BillingCalendar::class);

    expect($calendar->nextBillingDate(Carbon::parse('2026-01-31'), 31)->toDateString())->toBe('2026-02-28')
        ->and($calendar->nextBillingDate(Carbon::parse('2026-02-28'), 31)->toDateString())->toBe('2026-03-31')
        ->and($calendar->firstBillingDate(Carbon::parse('2026-03-20'), 5)->toDateString())->toBe('2026-04-05');
});

it('records a failure for one subscription without stopping the rest', function () {
    activeSubscription();
    $broken = activeSubscription(['customer_id' => customer(['mobile' => '09171111111'])->id]);
    Invoice::creating(function ($invoice) use ($broken) {
        if ($invoice->subscription_id === $broken->id) {
            throw new RuntimeException('boom');
        }
    });

    $run = bill();

    expect($run->created_count)->toBe(1)->and($run->failed_count)->toBe(1)->and($run->status)->toBe('completed_with_errors')
        ->and($run->failures[0]['subscription'])->toBe($broken->reference);
    Invoice::flushEventListeners();
});

it('rolls back a queued email when invoice creation fails', function () {
    $subscription = activeSubscription();
    Invoice::created(fn () => throw new RuntimeException('boom'));
    bill();
    Invoice::flushEventListeners();

    expect(NotificationLog::query()->count())->toBe(0)->and($subscription->fresh()->next_billing_date->toDateString())->toBe('2026-01-15');
});

it('flags overdue invoices and leaves paid ones alone', function () {
    activeSubscription();
    bill();
    Carbon::setTestNow('2026-02-05');

    expect(app(CollectionsService::class)->markOverdue())->toBe(1)
        ->and(Invoice::query()->sole()->status)->toBe(InvoiceStatus::Overdue);
});

it('queues invoice email through the log', function () {
    activeSubscription();
    bill();

    expect(NotificationLog::query()->sole())->event->toBe('invoice_generated')->status->toBe('queued')
        ->and(NotificationLog::query()->sole()->subject)->toContain(Invoice::query()->sole()->number);
});
