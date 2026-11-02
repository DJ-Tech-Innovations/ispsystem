<?php

namespace App\Domain\Tickets;

use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\NotificationEvent;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketService
{
    public function __construct(private NotificationDispatcher $notifications) {}

    public function create(array $data): Ticket
    {
        return DB::transaction(function () use ($data) {
            $priority = TicketPriority::from($data['priority']);
            $hours = (int) Settings::get("tickets.sla_hours_{$priority->value}", $priority->defaultSlaHours());

            $ticket = Ticket::query()->create([
                ...$data,
                'number' => ReferenceNumber::next('TKT'),
                'status' => TicketStatus::Open,
                'due_at' => now()->addHours($hours),
                'created_by' => auth()->id(),
            ]);
            $ticket->recordHistory('created');

            if ($ticket->assigned_to) {
                $ticket->recordHistory('assigned', null, $ticket->assignee?->name);
            }

            $this->notify(NotificationEvent::TicketCreated, $ticket);

            return $ticket;
        });
    }

    public function assign(Ticket $ticket, ?string $userId): void
    {
        DB::transaction(function () use ($ticket, $userId) {
            $old = $ticket->assignee?->name;
            $ticket->update(['assigned_to' => $userId]);
            $ticket->recordHistory('assigned', $old, $userId ? User::query()->find($userId)?->name : null);
        });
        $ticket->unsetRelation('assignee');
    }

    public function changeStatus(Ticket $ticket, TicketStatus $next, ?string $resolutionNotes = null): void
    {
        if ($ticket->status === $next) {
            return;
        }
        if (! $ticket->status->canTransitionTo($next)) {
            throw ValidationException::withMessages(['status' => "A {$ticket->status->label()} ticket can't become {$next->label()}."]);
        }
        if ($next === TicketStatus::Resolved && blank($resolutionNotes ?? $ticket->resolution_notes)) {
            throw ValidationException::withMessages(['resolution_notes' => 'Add resolution notes before resolving the ticket.']);
        }

        DB::transaction(function () use ($ticket, $next, $resolutionNotes) {
            $old = $ticket->status;
            $ticket->status = $next;
            $ticket->resolution_notes = $resolutionNotes ?? $ticket->resolution_notes;
            $ticket->resolved_at = $next === TicketStatus::Resolved ? now() : $ticket->resolved_at;
            $ticket->closed_at = $next === TicketStatus::Closed ? now() : $ticket->closed_at;
            $ticket->save();
            $ticket->recordHistory('status', $old->label(), $next->label());
            $this->notify(NotificationEvent::TicketStatusUpdated, $ticket, ['status' => $next->label()]);
        });
    }

    public function canReopen(Ticket $ticket): bool
    {
        if (! in_array($ticket->status, [TicketStatus::Resolved, TicketStatus::Closed], true) || ! Settings::get('tickets.allow_reopen', true)) {
            return false;
        }
        $since = $ticket->closed_at ?? $ticket->resolved_at;

        return ! $since || $since->gte(now()->subDays((int) Settings::get('tickets.reopen_window_days', 7)));
    }

    public function reopen(Ticket $ticket): void
    {
        if (! $this->canReopen($ticket)) {
            throw ValidationException::withMessages(['status' => 'The reopen window for this ticket has passed.']);
        }

        DB::transaction(function () use ($ticket) {
            $old = $ticket->status;
            $ticket->update(['status' => TicketStatus::Open, 'resolved_at' => null, 'closed_at' => null]);
            $ticket->recordHistory('reopened', $old->label(), TicketStatus::Open->label());
            $this->notify(NotificationEvent::TicketStatusUpdated, $ticket, ['status' => 'Reopened']);
        });
    }

    /** @param list<UploadedFile> $files */
    public function addMessage(Ticket $ticket, string $body, bool $internal, array $files = []): void
    {
        DB::transaction(function () use ($ticket, $body, $internal, $files) {
            $message = $ticket->messages()->create(['user_id' => auth()->id(), 'body' => $body, 'is_internal' => $internal]);

            $this->storeFiles($ticket, $message, $files);

            $ticket->recordHistory($internal ? 'internal_note' : 'reply');

            if (! $internal) {
                $ticket->first_response_at ??= now();
                $ticket->save();
                // The reply text goes out; internal notes never reach this branch.
                $this->notify(NotificationEvent::TicketReply, $ticket, ['reply' => $body]);
            }
        });
    }

    /** A reply from the customer: it reopens a waiting ticket and alerts staff, and never counts as our first response. */
    public function addCustomerMessage(Ticket $ticket, string $body, array $files = []): void
    {
        DB::transaction(function () use ($ticket, $body, $files) {
            $message = $ticket->messages()->create(['user_id' => auth()->id(), 'body' => $body, 'is_internal' => false]);
            $this->storeFiles($ticket, $message, $files);
            $ticket->recordHistory('customer_reply');

            if ($ticket->status === TicketStatus::WaitingForCustomer) {
                $ticket->update(['status' => TicketStatus::Open]);
                $ticket->recordHistory('status', TicketStatus::WaitingForCustomer->label(), TicketStatus::Open->label());
            }

            $this->alertStaff($ticket, $body);
        });
    }

    public function alertStaff(Ticket $ticket, string $message): void
    {
        $this->notifications->sendToStaff(NotificationEvent::TicketCustomerUpdate, $ticket->customer, $ticket->assignee?->email ?? (string) Settings::get('business.email'), [
            'ticket_number' => $ticket->number, 'ticket_subject' => $ticket->subject, 'message' => $message,
        ]);
    }

    public function autoClose(): int
    {
        $days = (int) Settings::get('tickets.auto_close_days', 7);
        if ($days <= 0) {
            return 0;
        }

        $count = 0;
        Ticket::query()->where('status', TicketStatus::Resolved)->where('resolved_at', '<', now()->subDays($days))->each(function (Ticket $ticket) use (&$count) {
            $this->changeStatus($ticket, TicketStatus::Closed);
            $count++;
        });

        return $count;
    }

    private function storeFiles(Ticket $ticket, TicketMessage $message, array $files): void
    {
        foreach ($files as $file) {
            $message->attachments()->create([
                'ticket_id' => $ticket->id,
                'path' => $file->store("tickets/{$ticket->id}", config('isp.attachments_disk')),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size' => $file->getSize(),
                'uploaded_by' => auth()->id(),
            ]);
        }
    }

    private function notify(NotificationEvent $event, Ticket $ticket, array $context = []): void
    {
        /** @var Customer $customer */
        $customer = $ticket->customer;
        $this->notifications->send($event, $customer, ['ticket_number' => $ticket->number, 'ticket_subject' => $ticket->subject, ...$context]);
    }
}
