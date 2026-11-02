<?php

namespace App\Http\Controllers\Portal;

use App\Domain\Tickets\TicketService;
use App\Enums\TicketCategory;
use App\Enums\TicketStatus;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketController extends PortalController
{
    private const FILE_RULES = ['file', 'max:5120', 'mimes:jpg,jpeg,png,webp,pdf,txt'];

    public function __construct(private TicketService $service) {}

    public function index(Request $request): Response
    {
        $customer = $this->customer($request);

        return Inertia::render('portal/tickets', [
            'tickets' => $customer->tickets()->latest()->paginate(12, ['id', 'number', 'subject', 'category', 'status', 'created_at'])->withQueryString(),
            'subscriptions' => $customer->subscriptions()->with('plan:id,name')->get(['id', 'reference', 'service_plan_id']),
            'categories' => TicketCategory::options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $customer = $this->customer($request);
        $data = $request->validate([
            'subscription_id' => ['nullable', 'uuid', Rule::exists('subscriptions', 'id')->where('customer_id', $customer->id)],
            'category' => ['required', Rule::enum(TicketCategory::class)],
            'subject' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:10000'],
        ]);

        // Priority and assignment are for staff to set.
        $ticket = $this->service->create([...$data, 'customer_id' => $customer->id, 'priority' => 'normal', 'source' => 'portal']);
        $this->service->alertStaff($ticket, $data['description']);

        return to_route('portal.ticket', $ticket->id)->with('success', "Ticket {$ticket->number} created");
    }

    public function show(Request $request, string $id): Response
    {
        $ticket = $this->find($request, $id);

        return Inertia::render('portal/ticket', [
            'ticket' => $ticket->only(['id', 'number', 'subject', 'description', 'category', 'status', 'created_at', 'resolved_at']),
            'category' => $ticket->category->label(),
            // Internal notes are filtered here and staff are shown only by first name.
            'messages' => $ticket->messages()->where('is_internal', false)->with(['user:id,name,type', 'attachments'])->get()->map(fn (TicketMessage $message) => [
                'id' => $message->id, 'body' => $message->body, 'created_at' => $message->created_at,
                'mine' => $message->user_id === $request->user()->id,
                'author' => $message->user_id === $request->user()->id ? 'You' : (str($message->user?->name)->before(' ')->toString() ?: 'Support').' · Support',
                'attachments' => $message->attachments->map(fn (TicketAttachment $file) => $file->only(['id', 'original_name'])),
            ]),
            'canReopen' => $this->service->canReopen($ticket),
        ]);
    }

    public function reply(Request $request, string $id): RedirectResponse
    {
        $ticket = $this->find($request, $id);
        if ($ticket->isClosedOut()) {
            throw ValidationException::withMessages(['body' => 'This ticket is closed. Reopen it to reply.']);
        }

        $data = $request->validate(['body' => ['required', 'string', 'max:10000'], 'files' => ['nullable', 'array', 'max:5'], 'files.*' => self::FILE_RULES]);
        $this->service->addCustomerMessage($ticket, $data['body'], $request->file('files', []));

        return back()->with('success', 'Reply sent');
    }

    public function reopen(Request $request, string $id): RedirectResponse
    {
        $this->service->reopen($this->find($request, $id));

        return back()->with('success', 'Ticket reopened');
    }

    public function close(Request $request, string $id): RedirectResponse
    {
        $ticket = $this->find($request, $id);
        if ($ticket->status !== TicketStatus::Resolved) {
            throw ValidationException::withMessages(['status' => 'Only resolved tickets can be confirmed.']);
        }
        $this->service->changeStatus($ticket, TicketStatus::Closed);

        return back()->with('success', 'Thanks for confirming');
    }

    public function attachment(Request $request, string $id): StreamedResponse
    {
        $attachment = TicketAttachment::query()->findOrFail($this->uuid($id));
        $ticket = $this->find($request, $attachment->ticket_id);
        abort_if($ticket->messages()->whereKey($attachment->ticket_message_id)->where('is_internal', true)->exists(), 404);

        return Storage::disk(config('isp.attachments_disk'))->download($attachment->path, $attachment->original_name);
    }

    private function find(Request $request, string $id): Ticket
    {
        return $this->customer($request)->tickets()->findOrFail($this->uuid($id));
    }
}
