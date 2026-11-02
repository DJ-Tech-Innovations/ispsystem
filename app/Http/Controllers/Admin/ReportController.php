<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $from = $request->date('from') ?? now()->startOfMonth();
        $to = $request->date('to') ?? now();
        $confirmed = fn () => Payment::query()->where('status', PaymentStatus::Confirmed)->whereDate('paid_at', '>=', $from)->whereDate('paid_at', '<=', $to);

        $byMethod = $confirmed()->selectRaw('method, count(*) as count, sum(amount) as total')->groupBy('method')->orderByDesc('total')->get()
            ->map(fn ($row) => ['method' => $row->method->label(), 'count' => (int) $row->count, 'total' => (float) $row->total]);

        $byStaff = $confirmed()->join('users', 'users.id', '=', 'payments.received_by')
            ->selectRaw('users.name, count(*) as count, sum(amount) as total')->groupBy('users.name')->orderByDesc('total')->get();

        return Inertia::render('reports/index', [
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'collections' => ['total' => (float) $confirmed()->sum('amount'), 'count' => $confirmed()->count(), 'by_method' => $byMethod, 'by_staff' => $byStaff],
            'aging' => $this->aging(),
            'debtors' => Invoice::query()->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])
                ->select('customer_id', DB::raw('sum(balance) as balance'), DB::raw('count(*) as invoices'), DB::raw('min(due_date) as oldest_due'))
                ->with('customer:id,reference,first_name,last_name,organization_name')->groupBy('customer_id')->orderByDesc('balance')->limit(10)->get(),
        ]);
    }

    private function aging(): array
    {
        $rows = Invoice::query()->whereIn('status', ['unpaid', 'partially_paid', 'overdue'])
            // Plain date comparisons, so this reads the same on every database and uses the ISP's "today".
            ->selectRaw("case
                when due_date >= ? then 'Not yet due'
                when due_date >= ? then '1–30 days'
                when due_date >= ? then '31–60 days'
                when due_date >= ? then '61–90 days'
                else 'Over 90 days' end as bucket, count(*) as count, sum(balance) as total", [
                today()->toDateString(), today()->subDays(30)->toDateString(), today()->subDays(60)->toDateString(), today()->subDays(90)->toDateString(),
            ])
            ->groupBy('bucket')->get()->keyBy('bucket');

        return collect(['Not yet due', '1–30 days', '31–60 days', '61–90 days', 'Over 90 days'])->map(fn ($bucket) => [
            'bucket' => $bucket, 'count' => (int) ($rows[$bucket]->count ?? 0), 'total' => (float) ($rows[$bucket]->total ?? 0),
        ])->all();
    }
}
