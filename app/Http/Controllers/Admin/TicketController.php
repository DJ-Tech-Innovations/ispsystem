<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Tickets\TicketService;
use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\TicketRequest;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use App\Support\CsvExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketController extends Controller
{
    public function __construct(private TicketService $service) {}

    public function index(Request $request): Response
    {
        return Inertia::render('tickets/index', [
            'tickets' => $this->filtered($request)->with(['customer:id,reference,first_name,last_name,organization_name', 'assignee:id,name'])
                ->orderByRaw("case when status in ('resolved','closed') then 1 else 0 end")
                ->orderByRaw("case priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end")
                ->oldest()->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('search', 'status', 'priority', 'category', 'assigned_to'),
            'staff' => $this->staff(),
        ]);
    }

    public function store(TicketRequest $request): RedirectResponse
    {
        $data = $request->validated();
        if (! $request->user()->can('tickets.assign')) {
            unset($data['assigned_to']);
        }
        $ticket = $this->service->create($data);

        return to_route('tickets.show', $ticket)->with('success', "Ticket {$ticket->number} created");
    }

    public function show(Request $request, Ticket $ticket): Response
    {
        $this->guard($request, $ticket);
        $internal = $request->user()->can('tickets.internal_notes');

        $ticket->load(['customer:id,reference,first_name,last_name,organization_name,mobile,email,service_address', 'subscription:id,reference,service_plan_id', 'subscription.plan:id,name', 'assignee:id,name', 'histories.user:id,name']);

        return Inertia::render('tickets/show', [
            'ticket' => $ticket,
            // Filtered on the server: internal notes never reach a browser that may not read them.
            'messages' => $ticket->messages()->with(['user:id,name,type', 'attachments'])->when(! $internal, fn ($q) => $q->where('is_internal', false))->get(),
            'staff' => $request->user()->can('tickets.assign') ? $this->staff() : [],
            'canReopen' => $this->service->canReopen($ticket),
        ]);
    }

    public function update(TicketRequest $request, Ticket $ticket): RedirectResponse
    {
        $this->guard($request, $ticket);
        $ticket->update(collect($request->validated())->except('assigned_to')->all());

        return back()->with('success', 'Ticket updated');
    }

    public function assign(Request $request, Ticket $ticket): RedirectResponse
    {
        $data = $request->validate(['assigned_to' => ['nullable', 'uuid', Rule::exists('users', 'id')->where('type', 'staff')]]);
        $this->service->assign($ticket, $data['assigned_to'] ?? null);

        return back()->with('success', 'Assignment updated');
    }

    public function status(Request $request, Ticket $ticket): RedirectResponse
    {
        $this->guard($request, $ticket);
        $data = $request->validate(['status' => ['required', Rule::enum(TicketStatus::class)], 'resolution_notes' => ['nullable', 'string', 'max:5000']]);
        $this->service->changeStatus($ticket, TicketStatus::from($data['status']), $data['resolution_notes'] ?? null);

        return back()->with('success', 'Status updated');
    }

    public function reopen(Request $request, Ticket $ticket): RedirectResponse
    {
        $this->guard($request, $ticket);
        $this->service->reopen($ticket);

        return back()->with('success', 'Ticket reopened');
    }

    public function reply(Request $request, Ticket $ticket): RedirectResponse
    {
        $this->guard($request, $ticket);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:10000'],
            'is_internal' => ['required', 'boolean'],
            'files' => ['nullable', 'array', 'max:5'],
            'files.*' => ['file', 'max:5120', 'mimes:jpg,jpeg,png,webp,pdf,txt,log,doc,docx,xls,xlsx'],
        ]);
        $internal = (bool) $data['is_internal'];
        abort_unless($request->user()->can($internal ? 'tickets.internal_notes' : 'tickets.reply'), 403);

        $this->service->addMessage($ticket, $data['body'], $internal, $request->file('files', []));

        return back()->with('success', $internal ? 'Internal note added' : 'Reply sent');
    }

    public function attachment(Request $request, TicketAttachment $attachment): StreamedResponse
    {
        $ticket = Ticket::query()->findOrFail($attachment->ticket_id);
        $this->guard($request, $ticket);
        $internal = $attachment->ticket_message_id && $ticket->messages()->whereKey($attachment->ticket_message_id)->where('is_internal', true)->exists();
        abort_if($internal && ! $request->user()->can('tickets.internal_notes'), 403);

        return Storage::disk(config('isp.attachments_disk'))->download($attachment->path, $attachment->original_name);
    }

    public function export(Request $request): StreamedResponse
    {
        return CsvExport::download('tickets', ['Number', 'Customer', 'Category', 'Subject', 'Priority', 'Status', 'Assigned To', 'Created', 'First Response', 'Resolved'],
            $this->filtered($request)->with(['customer', 'assignee:id,name'])->latest(),
            fn (Ticket $t) => [$t->number, $t->customer->name, $t->category->label(), $t->subject, $t->priority->label(), $t->status->label(), $t->assignee?->name, $t->created_at->toDateTimeString(), $t->first_response_at?->toDateTimeString(), $t->resolved_at?->toDateTimeString()]);
    }

    private function guard(Request $request, Ticket $ticket): void
    {
        abort_unless($ticket->isVisibleTo($request->user()), 403);
    }

    private function filtered(Request $request): Builder
    {
        return Ticket::query()->visibleTo($request->user())
            ->when($request->query('search'), function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->whereAny(['number', 'subject'], 'ilike', $like)
                    ->orWhereHas('customer', fn ($c) => $c->whereAny(['reference', 'first_name', 'last_name', 'organization_name'], 'ilike', $like)));
            })
            ->when($request->query('status') === 'active', fn ($q) => $q->active())
            ->when($request->query('status') && $request->query('status') !== 'active', fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->query('priority'), fn ($q, $priority) => $q->where('priority', $priority))
            ->when($request->query('category'), fn ($q, $category) => $q->where('category', $category))
            ->when($request->query('assigned_to'), fn ($q, $id) => $id === 'none' ? $q->whereNull('assigned_to') : $q->where('assigned_to', $id));
    }

    private function staff()
    {
        return User::query()->staff()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
    }
}
