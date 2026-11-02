<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CustomerStatus;
use App\Enums\InstallationStatus;
use App\Enums\InvoiceStatus;
use App\Enums\LeadStatus;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\InstallationJob;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Every figure is computed live from the database, and only sections the user may see are computed at all. */
class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $month = [now()->startOfMonth(), now()->endOfMonth()];
        $money = $user->can('dashboard.financials');
        $collectible = array_map(fn ($status) => $status->value, InvoiceStatus::collectible());

        return Inertia::render('dashboard', [
            'money' => $money,
            'customers' => $user->can('customers.view') ? [
                'total' => Customer::query()->count(),
                'active' => Customer::query()->where('status', CustomerStatus::Active)->count(),
                'suspended' => Customer::query()->where('status', CustomerStatus::Suspended)->count(),
                'new_this_month' => Customer::query()->whereBetween('registered_on', $month)->count(),
                'by_status' => Customer::query()->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
            ] : null,
            'pipeline' => $user->can('leads.view') ? Lead::query()->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status') : null,
            'installations' => $user->can('installations.view') ? [
                'pending' => InstallationJob::query()->visibleTo($user)->whereNotIn('status', [InstallationStatus::Completed, InstallationStatus::Cancelled])->count(),
                'unconfirmed' => InstallationJob::query()->visibleTo($user)->where('status', InstallationStatus::Completed)->whereNull('confirmed_at')->count(),
                'upcoming' => InstallationJob::query()->visibleTo($user)->with('customer:id,first_name,last_name,organization_name', 'technician:id,name')
                    ->whereNotIn('status', [InstallationStatus::Completed, InstallationStatus::Cancelled])
                    ->whereNotNull('preferred_at')->orderBy('preferred_at')->limit(5)->get(),
            ] : null,
            'billing' => $money && $user->can('invoices.view') ? [
                'invoices_this_month' => Invoice::query()->where('status', '<>', InvoiceStatus::Void)->whereBetween('issue_date', $month)->count(),
                'outstanding' => Invoice::query()->whereIn('status', $collectible)->sum('balance'),
                'overdue_amount' => Invoice::query()->where('status', InvoiceStatus::Overdue)->sum('balance'),
                'overdue_count' => Invoice::query()->where('status', InvoiceStatus::Overdue)->count(),
                'collected_this_month' => Payment::query()->where('status', PaymentStatus::Confirmed)->whereBetween('paid_at', $month)->sum('amount'),
                'mrr' => Subscription::query()->where('status', SubscriptionStatus::Active)->sum('monthly_amount'),
                'upcoming_due' => Invoice::query()->with('customer:id,first_name,last_name,organization_name')->whereIn('status', $collectible)
                    ->whereDate('due_date', '>=', today())->orderBy('due_date')->limit(5)->get(['id', 'number', 'customer_id', 'due_date', 'balance', 'status']),
                'collections' => $this->collectionsByMonth(),
            ] : null,
            'tickets' => $user->can('tickets.view') ? [
                'open' => Ticket::query()->visibleTo($user)->active()->count(),
                'overdue' => Ticket::query()->visibleTo($user)->active()->where('due_at', '<', now())->count(),
                'unassigned' => $user->can('tickets.view_all') ? Ticket::query()->active()->whereNull('assigned_to')->count() : 0,
                'recent' => Ticket::query()->visibleTo($user)->active()->with('customer:id,first_name,last_name,organization_name')
                    ->orderByRaw("case priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end")->oldest()->limit(5)->get(),
            ] : null,
            'followUps' => $user->can('leads.view') ? Lead::query()->whereNotIn('status', [LeadStatus::Converted, LeadStatus::Lost])
                ->whereDate('follow_up_on', '<=', today())->count() : 0,
            'activity' => $user->can('audit.view') ? ActivityLog::query()->with('user:id,name')->latest('created_at')->limit(7)->get() : [],
        ]);
    }

    /** @return list<array{label: string, amount: float}> */
    private function collectionsByMonth(): array
    {
        $rows = Payment::query()->where('status', PaymentStatus::Confirmed)->where('paid_at', '>=', now()->subMonths(5)->startOfMonth())
            ->select(DB::raw((DB::connection()->getDriverName() === 'pgsql' ? "to_char(paid_at, 'YYYY-MM')" : "date_format(paid_at, '%Y-%m')").' as month'), DB::raw('sum(amount) as total'))
            ->groupBy('month')->pluck('total', 'month');

        return collect(range(5, 0))->map(function (int $ago) use ($rows) {
            $date = now()->startOfMonth()->subMonths($ago);

            return ['label' => $date->format('M'), 'amount' => (float) ($rows[$date->format('Y-m')] ?? 0)];
        })->all();
    }
}
