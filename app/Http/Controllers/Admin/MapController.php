<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MapController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $pins = Customer::query()->whereNotNull('latitude')
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->get(['id', 'reference', 'first_name', 'last_name', 'organization_name', 'status', 'service_address', 'latitude', 'longitude', 'geo_stale']);

        return Inertia::render('map/index', [
            'pins' => $pins,
            'filters' => $request->only('status'),
            'totals' => ['pinned' => Customer::query()->whereNotNull('latitude')->count(), 'all' => Customer::query()->count(), 'review' => Customer::query()->where('geo_stale', true)->count()],
        ]);
    }
}
