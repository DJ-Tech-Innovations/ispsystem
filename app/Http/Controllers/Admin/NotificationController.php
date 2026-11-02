<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Notifications\DefaultTemplates;
use App\Http\Controllers\Controller;
use App\Jobs\DeliverNotification;
use App\Models\NotificationLog;
use App\Models\NotificationTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function logs(Request $request): Response
    {
        return Inertia::render('notifications/logs', [
            'logs' => NotificationLog::query()->with('customer:id,reference,first_name,last_name,organization_name')
                ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
                ->when($request->query('event'), fn ($q, $event) => $q->where('event', $event))
                ->when($request->query('search'), fn ($q, $term) => $q->whereAny(['recipient', 'subject'], 'ilike', '%'.addcslashes($term, '%_\\').'%'))
                ->latest()->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('status', 'event', 'search'),
            'events' => array_keys(DefaultTemplates::email()),
        ]);
    }

    public function retry(NotificationLog $log): RedirectResponse
    {
        abort_unless($log->status === 'failed', 422);
        $log->update(['status' => 'queued', 'error' => null]);
        DeliverNotification::dispatch($log->id);

        return back()->with('success', 'Notification queued again');
    }

    public function templates(): Response
    {
        return Inertia::render('notifications/templates', [
            'templates' => NotificationTemplate::query()->orderBy('event')->get(),
            'placeholders' => collect(DefaultTemplates::email())->map(fn ($template) => [...['customer_name', 'customer_reference', 'business_name', 'business_phone', 'business_email'], ...$template[2]]),
        ]);
    }

    public function updateTemplate(Request $request, NotificationTemplate $template): RedirectResponse
    {
        $template->update($request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:10000'],
            'is_enabled' => ['required', 'boolean'],
        ]));

        return back()->with('success', 'Template saved');
    }
}
