<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\Search;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('audit/index', [
            'logs' => ActivityLog::query()->with('user:id,name')
                ->when($request->query('module'), fn ($q, $module) => $q->where('module', $module))
                ->when($request->query('event'), fn ($q, $event) => $q->where('event', $event))
                ->when($request->query('search'), fn ($q, $term) => $q->where('description', Search::like(), '%'.addcslashes($term, '%_\\').'%'))
                ->latest('created_at')->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('module', 'event', 'search'),
            'modules' => ActivityLog::query()->distinct()->orderBy('module')->pluck('module'),
        ]);
    }
}
