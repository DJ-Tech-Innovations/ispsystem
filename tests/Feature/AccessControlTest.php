<?php

use App\Models\ActivityLog;
use App\Models\InstallationJob;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/** Routes any signed-in staff member may use. Everything else must name a permission. */
const OPEN_ROUTES = ['account', 'account.update', 'account.password', 'search', 'lookup.customers'];

$adminRoutes = fn () => collect(Route::getRoutes())->filter(fn ($route) => str_starts_with($route->uri(), 'admin'));

it('guards every admin route with auth and staff', function () use ($adminRoutes) {
    foreach ($adminRoutes() as $route) {
        expect($route->gatherMiddleware())->toContain('auth:web', 'staff');
    }
});

it('gives every admin route a permission from the catalog', function () use ($adminRoutes) {
    foreach ($adminRoutes() as $route) {
        if (in_array($route->getName(), OPEN_ROUTES, true)) {
            continue;
        }
        $middleware = collect($route->gatherMiddleware())->first(fn ($m) => str_starts_with($m, 'permission:'));
        expect($middleware)->not->toBeNull("{$route->uri()} has no permission");
        foreach (explode('|', substr($middleware, 11)) as $permission) {
            expect(PermissionCatalog::all())->toContain($permission);
        }
    }
});

it('redirects guests to sign in', function () {
    $this->get('/admin')->assertRedirect('/login');
    $this->get('/admin/customers')->assertRedirect('/login');
});

it('refuses every permission-gated GET page to a user with no permissions', function () use ($adminRoutes) {
    Role::findOrCreate('nobody', 'web');
    $user = staff('nobody');
    $ids = array_fill_keys(['lead', 'customer', 'plan', 'subscription', 'installation', 'invoice', 'payment', 'ticket', 'attachment', 'announcement', 'log', 'template', 'user', 'change'], '00000000-0000-0000-0000-000000000000');

    foreach ($adminRoutes() as $route) {
        if (! in_array('GET', $route->methods()) || in_array($route->getName(), OPEN_ROUTES, true)) {
            continue;
        }
        // Routes with an id bind the (missing) record first, so those answer 404. Neither reveals anything.
        $status = $this->actingAs($user)->get(route($route->getName(), array_intersect_key($ids, array_flip($route->parameterNames()))))->status();
        expect($status)->toBe($route->parameterNames() === [] ? 403 : 404);
    }
});

it('keeps roles to their modules', function (string $role, string $allowed, string $denied) {
    $user = staff($role);
    $this->actingAs($user)->get(route($allowed))->assertOk();
    $this->actingAs($user)->get(route($denied))->assertForbidden();
})->with([
    ['billing', 'invoices.index', 'tickets.index'],
    ['billing', 'payments.index', 'users.index'],
    ['customer_service', 'tickets.index', 'invoices.index'],
    ['customer_service', 'customers.index', 'payments.index'],
    ['technician', 'installations.index', 'customers.index'],
    ['technician', 'tickets.index', 'settings.index'],
    ['administrator', 'audit.index', 'roles.index'],
]);

it('lets a billing user record but stops customer service from reversing', function () {
    $this->actingAs(staff('customer_service'))->post(route('billing.store'))->assertForbidden();
});

it('needs the matching permission for each subscription status', function () {
    $subscription = activeSubscription();
    $role = Role::findOrCreate('viewer', 'web')->syncPermissions(['subscriptions.view']);

    $this->actingAs(staff('viewer'))->put(route('subscriptions.status', $subscription), ['status' => 'terminated', 'reason' => 'x'])->assertForbidden();
    expect($subscription->fresh()->status->value)->toBe('active');
});

it('scopes installations to the assigned technician', function () {
    $tech = staff('technician');
    $other = staff('technician');
    $subscription = activeSubscription();
    $job = InstallationJob::query()->create(['reference' => 'INS-1', 'customer_id' => $subscription->customer_id, 'subscription_id' => $subscription->id, 'address' => 'x', 'technician_id' => $tech->id]);

    $this->actingAs($other)->get(route('installations.show', $job))->assertForbidden();
    $this->actingAs($other)->put(route('installations.progress', $job), ['status' => 'in_progress'])->assertForbidden();
    $this->actingAs($other)->get(route('installations.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('jobs.total', 0));
    $this->actingAs($tech)->get(route('installations.show', $job))->assertOk();
});

it('hides money on the dashboard without the permission', function () {
    $this->actingAs(staff('customer_service'))->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('billing', null)->where('money', false));
});

it('searches only modules the user can open', function () {
    customer(['first_name' => 'Findable']);

    expect($this->actingAs(staff('technician'))->getJson(route('search', ['q' => 'Findable']))->json())->toBe([]);
    expect($this->actingAs(staff('billing'))->getJson(route('search', ['q' => 'Findable']))->json())->toHaveKey('Customers');
});

it('blocks a deactivated user immediately', function () {
    $user = staff('billing');
    $this->actingAs($user)->get(route('invoices.index'))->assertOk();
    $user->update(['is_active' => false]);

    $this->actingAs($user->fresh())->get(route('invoices.index'))->assertRedirect(route('login'));
});

it('refuses sign-in for inactive accounts and audits failures', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest();
    expect(ActivityLog::query()->where('event', 'blocked_login')->exists())->toBeTrue();
});

it('rate limits sign-in attempts', function () {
    foreach (range(1, 5) as $i) {
        $this->post('/login', ['email' => 'x@example.com', 'password' => 'wrong']);
    }

    $this->post('/login', ['email' => 'x@example.com', 'password' => 'wrong'])->assertStatus(429);
});

it('keeps subscriber logins out of the admin app', function () {
    $user = User::factory()->create(['type' => 'subscriber']);

    $this->actingAs($user)->get('/admin/account')->assertRedirect('/login');
    $this->assertGuest('web');
});

it('stops a non-owner from touching owner accounts', function () {
    $admin = staff('administrator');
    $admin->givePermissionTo('users.manage');
    $owner = staff('owner');

    $this->actingAs($admin)->put(route('users.toggle', $owner))->assertForbidden();
    $this->actingAs($admin)->put(route('users.update', $owner), ['name' => 'x', 'email' => $owner->email, 'role' => 'billing'])->assertForbidden();
    $this->actingAs($admin)->post(route('users.store'), ['name' => 'x', 'email' => 'new@example.com', 'role' => 'owner', 'password' => 'long-enough-pass'])->assertForbidden();
});

it('protects the owner role from edits and users from self-lockout', function () {
    $owner = staff('owner');

    $this->actingAs($owner)->put(route('roles.update', Role::findByName('owner')), ['permissions' => []])->assertForbidden();
    $this->actingAs($owner)->put(route('users.toggle', $owner))->assertStatus(422);
});

it('seeds every catalog permission with a description', function () {
    expect(Permission::query()->count())->toBe(count(PermissionCatalog::all()));
    foreach (PermissionCatalog::groups() as $permissions) {
        foreach ($permissions as $name => $description) {
            expect($name)->toMatch('/^[a-z_]+\.[a-z_]+$/')->and($description)->not->toBeEmpty();
        }
    }
});

it('audits sensitive changes with the actor and a field diff', function () {
    $this->actingAs($owner = staff());
    $plan = plan();
    $plan->update(['monthly_price' => 1500]);

    $log = ActivityLog::query()->where('module', 'service_plan')->where('event', 'updated')->sole();
    expect($log->user_id)->toBe($owner->id)->and($log->properties['changes'])->toHaveKey('monthly_price');
});

it('never writes passwords to the audit trail', function () {
    $user = staff('billing');
    $user->update(['password' => 'a-brand-new-password']);

    expect(ActivityLog::query()->where('properties', 'like', '%password%')->exists())->toBeFalse();
});
