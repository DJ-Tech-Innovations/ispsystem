<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Billing\GenerateInvoices;
use App\Http\Controllers\Controller;
use App\Models\BillingRun;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingRunController extends Controller
{
    public function index(Request $request, GenerateInvoices $generator): Response
    {
        return Inertia::render('billing/index', [
            'runs' => BillingRun::query()->with('starter:id,name')->latest()->paginate($request->integer('per_page', 25))->withQueryString(),
            'eligibleToday' => $generator->eligible(today())->count(),
        ]);
    }

    public function store(Request $request, GenerateInvoices $generator): RedirectResponse
    {
        $run = $generator->run(today(), 'manual', $request->user()->id);

        return back()->with($run->failed_count ? 'error' : 'success', "Billing run finished: {$run->created_count} created, {$run->skipped_count} skipped, {$run->failed_count} failed");
    }
}
