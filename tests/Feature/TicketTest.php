<?php

use App\Domain\Tickets\TicketService;
use App\Enums\TicketStatus;
use App\Models\NotificationLog;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Support\Settings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->service = app(TicketService::class);
    $this->owner = staff();
    $this->actingAs($this->owner);
    $this->ticket = $this->service->create(['customer_id' => customer()->id, 'category' => 'no_internet', 'subject' => 'Down', 'description' => 'No light', 'priority' => 'urgent']);
});

it('sets the response target from the priority and notifies the customer', function () {
    expect($this->ticket->due_at->diffInHours(now(), true))->toBeGreaterThan(7.9)->toBeLessThan(8.1)
        ->and(NotificationLog::query()->where('event', 'ticket_created')->count())->toBe(1);
});

it('never emails or exposes internal notes', function () {
    $this->service->addMessage($this->ticket, 'SECRET OLT NOTE', true);

    expect(NotificationLog::query()->where('body', 'like', '%SECRET%')->exists())->toBeFalse()
        ->and(NotificationLog::query()->where('event', 'ticket_reply')->exists())->toBeFalse()
        ->and($this->ticket->fresh()->first_response_at)->toBeNull();
});

it('hides internal notes from staff without the permission', function () {
    $this->service->addMessage($this->ticket, 'SECRET', true);
    $this->service->addMessage($this->ticket, 'Public', false);
    $role = Role::findOrCreate('reader', 'web')->syncPermissions(['tickets.view', 'tickets.view_all']);

    $this->actingAs(staff('reader'))->get(route('tickets.show', $this->ticket))
        ->assertInertia(fn (AssertableInertia $page) => $page->has('messages', 1)->where('messages.0.body', 'Public'));
});

it('blocks internal attachments from staff without the permission', function () {
    Storage::fake('local');
    $this->service->addMessage($this->ticket, 'see file', true, [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')]);
    Role::findOrCreate('reader', 'web')->syncPermissions(['tickets.view', 'tickets.view_all']);

    $this->actingAs(staff('reader'))->get(route('tickets.attachment', TicketAttachment::query()->sole()))->assertForbidden();
    $this->actingAs($this->owner)->get(route('tickets.attachment', TicketAttachment::query()->sole()))->assertOk();
});

it('stops a technician from opening a ticket assigned to someone else', function () {
    $tech = staff('technician');
    $this->actingAs($tech)->get(route('tickets.show', $this->ticket))->assertForbidden();

    $this->ticket->update(['assigned_to' => $tech->id]);
    $this->actingAs($tech)->get(route('tickets.show', $this->ticket))->assertOk();
});

it('stops a technician from posting to a ticket that is not theirs', function () {
    $this->actingAs(staff('technician'))->post(route('tickets.reply', $this->ticket), ['body' => 'hi', 'is_internal' => false])->assertForbidden();
});

it('records the first response time once', function () {
    $this->service->addMessage($this->ticket, 'On it', false);
    $first = $this->ticket->fresh()->first_response_at;
    $this->travel(1)->hour();
    $this->service->addMessage($this->ticket->fresh(), 'Update', false);

    expect($this->ticket->fresh()->first_response_at->equalTo($first))->toBeTrue();
});

it('needs resolution notes to resolve', function () {
    expect(fn () => $this->service->changeStatus($this->ticket, TicketStatus::Resolved))->toThrow(ValidationException::class);

    $this->service->changeStatus($this->ticket, TicketStatus::Resolved, 'Replaced ONU');
    expect($this->ticket->fresh())->status->toBe(TicketStatus::Resolved)->resolved_at->not->toBeNull();
});

it('follows the reopen policy', function () {
    $this->service->changeStatus($this->ticket, TicketStatus::Resolved, 'Fixed');
    expect($this->service->canReopen($this->ticket->fresh()))->toBeTrue();

    $this->travel(8)->days();
    expect($this->service->canReopen($this->ticket->fresh()))->toBeFalse();

    $this->travelBack();
    Settings::put(['tickets.allow_reopen' => false]);
    expect($this->service->canReopen($this->ticket->fresh()))->toBeFalse();
});

it('auto-closes old resolved tickets', function () {
    $this->service->changeStatus($this->ticket, TicketStatus::Resolved, 'Fixed');
    $this->travel(8)->days();

    expect($this->service->autoClose())->toBe(1)->and($this->ticket->fresh()->status)->toBe(TicketStatus::Closed);
});

it('logs the ticket history', function () {
    $tech = staff('technician');
    $this->service->assign($this->ticket, $tech->id);
    $this->service->changeStatus($this->ticket->fresh(), TicketStatus::InProgress);

    expect(Ticket::query()->sole()->histories()->pluck('event')->all())->toContain('created', 'assigned', 'status');
});

it('rejects a dangerous upload', function () {
    $this->post(route('tickets.reply', $this->ticket), ['body' => 'x', 'is_internal' => false, 'files' => [UploadedFile::fake()->create('shell.php', 10, 'application/x-php')]])
        ->assertSessionHasErrors('files.0');
});
