<?php

namespace App\Domain\Billing;

use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\InvoiceStatus;
use App\Enums\NotificationEvent;
use App\Models\Invoice;
use App\Support\Money;
use App\Support\Settings;

/** Daily housekeeping on unpaid invoices: flag overdue ones, send due and overdue reminders. */
class CollectionsService
{
    public function __construct(private NotificationDispatcher $notifications) {}

    public function markOverdue(): int
    {
        $count = 0;
        Invoice::query()
            ->whereIn('status', [InvoiceStatus::Unpaid, InvoiceStatus::PartiallyPaid])
            ->whereDate('due_date', '<', today())
            ->each(function (Invoice $invoice) use (&$count) {
                $invoice->recalculate();
                $count++;
            });

        return $count;
    }

    public function sendReminders(): int
    {
        $sent = 0;
        $dueDate = today()->addDays((int) Settings::get('billing.due_reminder_days', 3));
        $overdueDate = today()->subDays((int) Settings::get('billing.overdue_reminder_days', 3));

        $remind = function ($query, NotificationEvent $event) use (&$sent) {
            $query->with('customer')->each(function (Invoice $invoice) use ($event, &$sent) {
                $this->notifications->send($event, $invoice->customer, [
                    'invoice_number' => $invoice->number,
                    'amount' => Money::format($invoice->balance),
                    'due_date' => $invoice->due_date->format('F j, Y'),
                ]);
                $sent++;
            });
        };

        $remind(Invoice::query()->whereIn('status', [InvoiceStatus::Unpaid, InvoiceStatus::PartiallyPaid])->whereDate('due_date', $dueDate), NotificationEvent::InvoiceDueReminder);
        $remind(Invoice::query()->where('status', InvoiceStatus::Overdue)->whereDate('due_date', $overdueDate), NotificationEvent::InvoiceOverdueReminder);

        return $sent;
    }
}
