<?php

namespace App\Domain\Billing;

use App\Domain\Subscriptions\BillingCalendar;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Models\BillingRun;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Support\Money;
use App\Support\Settings;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * The monthly billing engine. Safe to re-run: the partial unique index on (subscription, period) is the real guard,
 * so two workers racing on the same day can never produce a second invoice for a period.
 */
class GenerateInvoices
{
    public function __construct(private InvoiceService $invoices, private BillingCalendar $calendar) {}

    public function eligible(CarbonInterface $date): Builder
    {
        $statuses = [SubscriptionStatus::Active];
        if (Settings::get('billing.bill_suspended', false)) {
            $statuses[] = SubscriptionStatus::Suspended;
        }

        return Subscription::query()
            ->whereIn('status', $statuses)
            ->whereNotNull('next_billing_date')
            ->whereDate('next_billing_date', '<=', $date)
            ->whereDate('billing_start_date', '<=', $date);
    }

    public function run(CarbonInterface $date, string $trigger = 'scheduler', ?string $startedBy = null): BillingRun
    {
        $run = BillingRun::query()->create(['run_date' => $date, 'trigger' => $trigger, 'started_by' => $startedBy]);
        $created = $skipped = 0;
        $total = '0.00';
        $failures = [];

        $subscriptions = $this->eligible($date)->with(['customer', 'plan'])->get();

        foreach ($subscriptions as $subscription) {
            // A subscription that is months behind catches up one period at a time.
            $guard = 0;
            while ($subscription->next_billing_date->lte($date) && $guard++ < 12) {
                try {
                    $invoice = $this->billPeriod($subscription, $run, $date);
                    if ($invoice) {
                        $created++;
                        $total = Money::add($total, $invoice->total);
                    } else {
                        $skipped++;
                    }
                } catch (Throwable $exception) {
                    report($exception);
                    $failures[] = ['subscription' => $subscription->reference, 'error' => $exception->getMessage()];
                    break;
                }
            }
        }

        $run->update([
            'status' => $failures === [] ? 'completed' : 'completed_with_errors',
            'eligible_count' => $subscriptions->count(),
            'created_count' => $created,
            'skipped_count' => $skipped,
            'failed_count' => count($failures),
            'total_amount' => $total,
            'failures' => $failures ?: null,
            'finished_at' => now(),
        ]);

        return $run;
    }

    /** Returns the new invoice, or null when this period was already billed. */
    private function billPeriod(Subscription $subscription, BillingRun $run, CarbonInterface $date): ?Invoice
    {
        $start = $subscription->next_billing_date->toImmutable();
        $anchor = $subscription->billing_day ?: $subscription->billing_start_date->day;
        $next = $this->calendar->nextBillingDate($start, $anchor);
        $end = $next->subDay();

        $exists = Invoice::query()
            ->where('subscription_id', $subscription->id)
            ->whereDate('period_start', $start)
            ->where('status', '<>', InvoiceStatus::Void)
            ->exists();

        if ($exists) {
            $this->advance($subscription, $next);

            return null;
        }

        try {
            $invoice = DB::transaction(function () use ($subscription, $run, $date, $start, $end, $next) {
                $items = [[
                    'description' => "{$subscription->plan->name} ({$start->format('M j')} – {$end->format('M j, Y')})",
                    'quantity' => 1,
                    'unit_price' => $subscription->monthly_amount,
                ]];

                $chargeInstallation = Settings::get('billing.installation_fee_on_first_invoice', true)
                    && ! $subscription->installation_fee_billed_at
                    && Money::cmp($subscription->installation_fee, 0) > 0;

                if ($chargeInstallation) {
                    $items[] = ['description' => 'Installation fee', 'quantity' => 1, 'unit_price' => $subscription->installation_fee];
                    $subscription->installation_fee_billed_at = now();
                }

                $invoice = $this->invoices->create([
                    'customer_id' => $subscription->customer_id,
                    'subscription_id' => $subscription->id,
                    'billing_run_id' => $run->id,
                    'period_start' => $start,
                    'period_end' => $end,
                    'issue_date' => $date,
                    'due_date' => $date->copy()->addDays((int) Settings::get('billing.due_days', 15)),
                    'notes' => Settings::get('billing.invoice_footer') ?: null,
                ], $items, InvoiceStatus::Unpaid);

                $this->advance($subscription, $next);
                $this->invoices->notifyGenerated($invoice);

                return $invoice;
            });
        } catch (QueryException $exception) {
            // 23505: a concurrent run won the race for this period. That is the constraint doing its job.
            if ($exception->getCode() !== '23505' || ! str_contains($exception->getMessage(), 'invoices_subscription_period_unique')) {
                throw $exception;
            }
            $subscription->refresh();

            return null;
        }

        return $invoice;
    }

    private function advance(Subscription $subscription, CarbonInterface $next): void
    {
        $subscription->next_billing_date = $next;
        $subscription->saveQuietly();
    }
}
