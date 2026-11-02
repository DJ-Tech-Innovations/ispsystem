<?php

use App\Domain\Billing\InvoiceService;
use App\Domain\Customers\PortalAccess;
use App\Domain\Payments\PaymentService;
use App\Domain\Tickets\TicketService;
use App\Enums\InvoiceStatus;
use App\Enums\TicketStatus;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use App\Notifications\QueuedResetPassword;
use App\Support\ReferenceNumber;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

function subscriber(?Customer $customer = null): User
{
    $customer ??= customer(['email' => fake()->unique()->safeEmail(), 'mobile' => '0917'.fake()->unique()->numerify('#######')]);
    $user = User::factory()->create(['email' => $customer->email, 'type' => 'subscriber']);
    $user->syncRoles('subscriber');
    $customer->update(['user_id' => $user->id]);

    return $user->fresh();
}

function invoiceFor(Customer $customer, InvoiceStatus $status = InvoiceStatus::Unpaid): Invoice
{
    return app(InvoiceService::class)->create(['customer_id' => $customer->id, 'issue_date' => today(), 'due_date' => today()->addDays(10)], [['description' => 'Service', 'unit_price' => 1000]], $status);
}

function ticketFor(Customer $customer): Ticket
{
    return Ticket::query()->create(['number' => ReferenceNumber::next('TKT'), 'customer_id' => $customer->id, 'category' => 'other', 'subject' => 'S', 'description' => 'D', 'priority' => 'normal', 'status' => TicketStatus::Open]);
}

beforeEach(function () {
    $this->me = subscriber();
    $this->mine = $this->me->customer;
    $this->other = customer(['email' => 'other@example.com', 'mobile' => '09178888888', 'first_name' => 'Other', 'account_notes' => 'SECRET ACCOUNT NOTE']);
});

it('guards every portal route with auth and subscriber', function () {
    collect(Route::getRoutes())->filter(fn ($r) => str_starts_with($r->uri(), 'portal') && ! in_array($r->getName(), ['portal.login', 'portal.login.store', 'portal.logout'], true))
        ->each(fn ($r) => expect($r->gatherMiddleware())->toContain('auth:customer', 'subscriber'));
});

it('sends guests to the customer login', function () {
    $this->get('/portal')->assertRedirect('/portal/login');
    $this->get('/portal/invoices')->assertRedirect('/portal/login');
});

it('routes each kind of user to their own area after sign-in', function () {
    $this->post('/portal/login', ['email' => $this->me->email, 'password' => 'password'])->assertRedirect('/portal');

    $staff = staff();
    $this->post('/login', ['email' => $staff->email, 'password' => 'password'])->assertRedirect('/admin');
});

it('sends a subscriber who was aiming at the admin app to the portal', function () {
    $this->get('/admin')->assertRedirect('/login');

    $this->post('/portal/login', ['email' => $this->me->email, 'password' => 'password'])->assertRedirect('/portal');
});

it('keeps the two areas apart', function () {
    $this->actingAs($this->me, 'customer')->get('/admin')->assertRedirect('/login');
    auth()->forgetGuards();
    $this->actingAs(staff(), 'web')->get('/portal')->assertRedirect('/portal/login');
});

it('signs out a subscriber whose access was revoked', function () {
    app(PortalAccess::class)->revoke($this->mine);

    $this->actingAs($this->me->fresh(), 'customer')->get('/portal')->assertRedirect('/portal/login');
    $this->assertGuest();
});

it('returns 404 for every record belonging to another customer', function () {
    Storage::fake('local');
    $invoice = invoiceFor($this->other);
    $this->actingAs(staff(), 'web');
    $payment = app(PaymentService::class)->record($invoice, ['paid_at' => now(), 'amount' => '100.00', 'method' => 'cash']);
    $ticket = ticketFor($this->other);
    app(TicketService::class)->addMessage($ticket, 'file', false, [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')]);
    $attachment = TicketAttachment::query()->sole();

    $this->actingAs($this->me, 'customer');
    foreach ([route('portal.invoice', $invoice->id), route('portal.invoice.print', $invoice->id), route('portal.receipt', $payment->id), route('portal.ticket', $ticket->id), route('portal.attachment', $attachment->id)] as $url) {
        $this->get($url)->assertNotFound();
    }
    $this->post(route('portal.ticket.reply', $ticket->id), ['body' => 'hi'])->assertNotFound();
    $this->post(route('portal.ticket.reopen', $ticket->id))->assertNotFound();
    $this->post(route('portal.ticket.close', $ticket->id))->assertNotFound();
});

it('lists only the customer\'s own records', function () {
    invoiceFor($this->mine);
    invoiceFor($this->other);
    ticketFor($this->mine);
    ticketFor($this->other);

    $this->actingAs($this->me, 'customer')->get('/portal/invoices')->assertInertia(fn (AssertableInertia $p) => $p->where('invoices.total', 1));
    $this->actingAs($this->me, 'customer')->get('/portal/tickets')->assertInertia(fn (AssertableInertia $p) => $p->where('tickets.total', 1));
    $this->actingAs($this->me, 'customer')->get('/portal')->assertInertia(fn (AssertableInertia $p) => $p->where('balance', '1000.00'));
});

it('ignores a customer id sent by the browser', function () {
    $this->actingAs($this->me, 'customer')->post('/portal/tickets', ['customer_id' => $this->other->id, 'category' => 'other', 'subject' => 'x', 'description' => 'y', 'priority' => 'urgent', 'assigned_to' => staff()->id]);

    expect(Ticket::query()->sole())->customer_id->toBe($this->mine->id)->priority->value->toBe('normal')->assigned_to->toBeNull();
});

it('refuses a ticket linked to someone else\'s subscription', function () {
    $foreign = activeSubscription([], $this->other);

    $this->actingAs($this->me, 'customer')->post('/portal/tickets', ['subscription_id' => $foreign->id, 'category' => 'other', 'subject' => 'x', 'description' => 'y'])->assertSessionHasErrors('subscription_id');
});

it('hides draft invoices', function () {
    $draft = invoiceFor($this->mine, InvoiceStatus::Draft);

    $this->actingAs($this->me, 'customer')->get(route('portal.invoice', $draft->id))->assertNotFound();
    $this->actingAs($this->me, 'customer')->get('/portal/invoices')->assertInertia(fn (AssertableInertia $p) => $p->where('invoices.total', 0));
});

it('never sends internal notes, their files or staff-only fields to the browser', function () {
    Storage::fake('local');
    $this->mine->update(['account_notes' => 'SECRET ACCOUNT NOTE']);
    $subscription = activeSubscription(['notes' => 'SECRET SUB NOTE'], $this->mine);
    $ticket = ticketFor($this->mine);
    $ticket->update(['resolution_notes' => 'SECRET RESOLUTION']);
    $this->actingAs($staff = staff(), 'web');
    app(TicketService::class)->addMessage($ticket, 'SECRET INTERNAL', true, [UploadedFile::fake()->create('x.pdf', 5, 'application/pdf')]);
    app(TicketService::class)->addMessage($ticket, 'Public reply', false);
    $internalFile = TicketAttachment::query()->sole();

    $this->actingAs($this->me, 'customer');
    foreach (['/portal', '/portal/account', '/portal/tickets', route('portal.ticket', $ticket->id)] as $url) {
        $this->get($url)->assertOk()->assertDontSee('SECRET');
    }
    $this->get(route('portal.ticket', $ticket->id))->assertSee('Public reply')->assertDontSee($staff->email);
    $this->get(route('portal.attachment', $internalFile->id))->assertNotFound();
    expect($subscription->id)->not->toBeEmpty();
});

it('shows no permissions or staff counts to a subscriber', function () {
    $this->actingAs($this->me, 'customer')->get('/portal')->assertInertia(fn (AssertableInertia $p) => $p->where('auth.permissions', [])->where('counts', [])->where('enums', []));
});

it('handles a customer reply without faking a first response or emailing them', function () {
    $this->actingAs($this->me, 'customer');
    $this->post('/portal/tickets', ['category' => 'no_internet', 'subject' => 'Down', 'description' => 'No light']);
    $ticket = Ticket::query()->sole();
    $ticket->update(['status' => TicketStatus::WaitingForCustomer]);
    NotificationLog::query()->delete();

    $this->post(route('portal.ticket.reply', $ticket->id), ['body' => 'Still down'])->assertSessionHasNoErrors();

    $fresh = $ticket->fresh();
    expect($fresh)->status->toBe(TicketStatus::Open)->first_response_at->toBeNull()
        ->and(NotificationLog::query()->sole())->event->toBe('ticket_customer_update')->recipient->toBe('support@example.com')
        ->and($fresh->messages()->sole()->is_internal)->toBeFalse();
});

it('emails the assignee about a customer reply even if the customer opted out', function () {
    $assignee = staff('technician');
    $ticket = ticketFor($this->mine);
    $ticket->update(['assigned_to' => $assignee->id]);
    $this->mine->notificationPreference()->create(['email_enabled' => false]);

    $this->actingAs($this->me, 'customer')->post(route('portal.ticket.reply', $ticket->id), ['body' => 'Hello']);

    expect(NotificationLog::query()->sole()->recipient)->toBe($assignee->email);
});

it('lets a customer confirm or reopen a resolved ticket, within policy', function () {
    $ticket = ticketFor($this->mine);
    $this->actingAs(staff(), 'web');
    app(TicketService::class)->changeStatus($ticket, TicketStatus::Resolved, 'Fixed');

    $this->actingAs($this->me, 'customer')->post(route('portal.ticket.reply', $ticket->id), ['body' => 'x'])->assertSessionHasErrors('body');
    $this->actingAs($this->me, 'customer')->post(route('portal.ticket.reopen', $ticket->id))->assertSessionHasNoErrors();
    expect($ticket->fresh()->status)->toBe(TicketStatus::Open);

    $this->post(route('portal.ticket.close', $ticket->id))->assertSessionHasErrors('status');
});

it('refuses executable uploads', function () {
    $ticket = ticketFor($this->mine);

    $this->actingAs($this->me, 'customer')->post(route('portal.ticket.reply', $ticket->id), ['body' => 'x', 'files' => [UploadedFile::fake()->create('a.php', 5, 'application/x-php')]])->assertSessionHasErrors('files.0');
});

it('lets customers change phone numbers but nothing else', function () {
    $this->actingAs($this->me, 'customer')->put('/portal/account', ['mobile' => '09170001111', 'first_name' => 'Hacked', 'service_address' => 'Elsewhere', 'status' => 'active'])->assertSessionHasNoErrors();

    expect($this->mine->fresh())->mobile->toBe('09170001111')->first_name->toBe('Juan')->service_address->toBe('1 Rizal St');
});

it('saves notification preferences', function () {
    $this->actingAs($this->me, 'customer')->put('/portal/account/preferences', ['email_enabled' => false, 'sms_enabled' => true])->assertSessionHasNoErrors();

    expect($this->mine->fresh()->wantsChannel('email'))->toBeFalse();
});

it('invites a customer with no secret in the email or log', function () {
    $fresh = customer(['email' => 'New.Person@Example.com', 'mobile' => '09170002222']);
    $this->actingAs(staff('customer_service'), 'web')->post(route('customers.portal.invite', $fresh))->assertSessionHasNoErrors();

    $user = $fresh->fresh()->user;
    $log = NotificationLog::query()->where('event', 'portal_invitation')->sole();
    expect($user)->type->toBe('subscriber')->email->toBe('new.person@example.com')
        ->and($user->hasRole('subscriber'))->toBeTrue()
        ->and($log->body)->toContain('/forgot-password?portal=1')->not->toContain('token');
});

it('needs a free email to invite', function () {
    $noEmail = customer(['email' => null, 'mobile' => '09170003333']);
    $taken = customer(['email' => staff()->email, 'mobile' => '09170004444']);
    $this->actingAs(staff(), 'web');

    $this->post(route('customers.portal.invite', $noEmail))->assertSessionHasErrors('portal');
    $this->post(route('customers.portal.invite', $taken))->assertSessionHasErrors('portal');
});

it('blocks portal management without permission', function () {
    $this->actingAs(staff('billing'), 'web')->post(route('customers.portal.invite', $this->other))->assertForbidden();
});

it('moves the login with the customer email, and refuses a collision', function () {
    $payload = fn (string $email) => [...$this->mine->only(['type', 'first_name', 'last_name', 'mobile', 'billing_address', 'service_address']), 'type' => 'residential', 'email' => $email];
    $staff = staff();

    $this->actingAs($staff)->put(route('customers.update', $this->mine), $payload('moved@example.com'))->assertSessionHasNoErrors();
    expect($this->me->fresh()->email)->toBe('moved@example.com');

    $this->put(route('customers.update', $this->mine), $payload($staff->email))->assertSessionHasErrors('email');
    expect($this->mine->fresh()->email)->toBe('moved@example.com');
});

it('sends the password link by queue and gives nothing away about unknown emails', function () {
    Notification::fake();

    $this->post('/forgot-password', ['email' => $this->me->email])->assertSessionHas('status');
    Notification::assertSentTo($this->me, QueuedResetPassword::class);
    expect(new QueuedResetPassword('x'))->toBeInstanceOf(ShouldQueue::class)->toBeInstanceOf(ResetPassword::class);

    $this->from('/forgot-password')->post('/forgot-password', ['email' => 'nobody@example.com'])->assertSessionHas('status')->assertSessionDoesntHaveErrors();
});

it('prints only the customer\'s own documents with safe fields', function () {
    $invoice = invoiceFor($this->mine);
    $this->actingAs(staff(), 'web');
    $payment = app(PaymentService::class)->record($invoice, ['paid_at' => now(), 'amount' => '100.00', 'method' => 'cash']);

    $this->actingAs($this->me, 'customer');
    $this->get(route('portal.invoice.print', $invoice->id))->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('invoices/print')->missing('invoice.customer.account_notes')->missing('invoice.created_by'));
    $this->get(route('portal.receipt', $payment->id))->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('payments/receipt')->missing('payment.customer.account_notes'));
    expect(Payment::query()->count())->toBe(1);
});
