<?php

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;

beforeEach(function () {
    $this->customer = customer(['email' => 'side@example.com']);
    $this->subscriber = User::factory()->create(['email' => 'side@example.com', 'type' => 'subscriber']);
    $this->subscriber->syncRoles('subscriber');
    $this->customer->update(['user_id' => $this->subscriber->id]);
    $this->staff = staff();
});

function signInBoth($test): void
{
    $test->post('/login', ['email' => $test->staff->email, 'password' => 'password'])->assertRedirect('/admin');
    $test->post('/portal/login', ['email' => 'side@example.com', 'password' => 'password'])->assertRedirect('/portal');
}

it('keeps both signed in, in either order, each seeing their own area', function () {
    signInBoth($this);

    $this->get('/admin')->assertOk()->assertInertia(fn ($p) => $p->where('auth.user.id', $this->staff->id));
    $this->get('/portal')->assertOk()->assertInertia(fn ($p) => $p->where('auth.user.id', $this->subscriber->id)->where('auth.permissions', []));
});

it('records portal actions under the customer, not the signed-in staff member', function () {
    signInBoth($this);

    $this->post('/portal/tickets', ['category' => 'other', 'subject' => 'Mine', 'description' => 'From the customer']);

    expect(Ticket::query()->sole())->created_by->toBe($this->subscriber->id)->customer_id->toBe($this->customer->id);
});

it('records admin actions under staff while a customer is signed in', function () {
    signInBoth($this);
    $this->post('/admin/customers/'.$this->customer->id.'/interactions', ['type' => 'note', 'body' => 'Called']);

    expect($this->customer->interactions()->sole()->created_by)->toBe($this->staff->id);
});

it('signing out of one leaves the other signed in, both ways', function () {
    signInBoth($this);
    $this->post('/logout')->assertRedirect('/login');
    $this->assertGuest('web');
    $this->assertAuthenticatedAs($this->subscriber->fresh(), 'customer');
    $this->get('/portal')->assertOk();

    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password']);
    $this->post('/portal/logout')->assertRedirect('/portal/login');
    $this->assertGuest('customer');
    $this->get('/admin')->assertOk();
});

it('ends the session once nobody is left', function () {
    signInBoth($this);
    $this->post('/logout');
    $id = session()->getId();
    $this->post('/portal/logout');

    expect(session()->getId())->not->toBe($id);
    $this->assertGuest('web');
    $this->assertGuest('customer');
});

it('keeps the form token for the area still open', function () {
    signInBoth($this);
    $token = session()->token();
    $this->post('/logout');

    expect(session()->token())->toBe($token);
});

it('never lets a remembered page cross between areas', function () {
    $this->get('/portal/invoices')->assertRedirect('/portal/login');
    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password'])->assertRedirect('/admin');
});

it('returns staff to the admin page they wanted', function () {
    $this->get('/admin/customers')->assertRedirect('/login');
    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password'])->assertRedirect(url('/admin/customers'));
});

it('refuses each account at the other door', function () {
    $this->post('/login', ['email' => 'side@example.com', 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest('web');
    $this->post('/portal/login', ['email' => $this->staff->email, 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest('customer');
});

it('handles wrong passwords and inactive customers at the portal door', function () {
    $this->post('/portal/login', ['email' => 'side@example.com', 'password' => 'wrong'])->assertSessionHasErrors('email');
    $this->subscriber->update(['is_active' => false]);
    $this->post('/portal/login', ['email' => 'side@example.com', 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest('customer');
});

it('rate limits the portal sign-in', function () {
    foreach (range(1, 5) as $i) {
        $this->post('/portal/login', ['email' => 'side@example.com', 'password' => 'wrong']);
    }

    $this->post('/portal/login', ['email' => 'side@example.com', 'password' => 'wrong'])->assertStatus(429);
});

it('revoking a customer leaves staff signed in', function () {
    signInBoth($this);
    $this->subscriber->update(['is_active' => false]);
    Auth::forgetGuards();

    $this->get('/portal')->assertRedirect('/portal/login');
    $this->get('/admin')->assertOk();
});

it('sends people to their own sign-in after a password reset', function () {
    $token = Password::createToken($this->subscriber);

    $this->post('/reset-password', ['token' => $token, 'email' => 'side@example.com', 'password' => 'a-Long-Pass-92!x', 'password_confirmation' => 'a-Long-Pass-92!x'])->assertRedirect('/portal/login');
});
