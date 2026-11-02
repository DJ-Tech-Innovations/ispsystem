<?php

use App\Models\BillingRun;
use App\Models\Customer;
use App\Models\InstallationJob;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\Ticket;
use App\Models\User;
use App\Support\Settings;
use Database\Seeders\DemoSeeder;

it('renders every admin page for the owner against demo data', function () {
    $this->seed(DemoSeeder::class);
    $owner = User::query()->where('email', 'owner@ispsystem.test')->sole();
    $this->actingAs($owner);

    $pages = [
        '/admin', '/admin/leads', '/admin/leads?view=list', '/admin/customers', '/admin/customers/'.Customer::query()->first()->id, '/admin/plans', '/admin/subscriptions',
        '/admin/subscriptions/'.Subscription::query()->first()->id, '/admin/installations', '/admin/installations/'.InstallationJob::query()->first()->id,
        '/admin/invoices', '/admin/invoices/create', '/admin/invoices/'.Invoice::query()->first()->id, '/admin/invoices/'.Invoice::query()->first()->id.'/print', '/admin/billing',
        '/admin/payments', '/admin/payments/'.Payment::query()->first()->id, '/admin/payments/'.Payment::query()->first()->id.'/receipt', '/admin/tickets', '/admin/tickets/'.Ticket::query()->first()->id,
        '/admin/announcements', '/admin/reports', '/admin/notifications', '/admin/notification-templates', '/admin/users', '/admin/roles', '/admin/audit-trail', '/admin/settings', '/admin/map', '/admin/plan-upgrades', '/admin/website', '/admin/account',
    ];

    foreach ($pages as $page) {
        $this->get($page)->assertOk();
    }
    expect(BillingRun::query()->count())->toBeGreaterThan(0);
});

it('exports each key list as CSV, with formula cells neutralised', function () {
    $this->actingAs(staff());
    customer(['first_name' => '=HYPERLINK("x")', 'mobile' => '+639171234567']);

    foreach (['customers', 'leads', 'subscriptions', 'invoices', 'payments', 'tickets'] as $list) {
        $this->get("/admin/$list/export")->assertOk()->assertDownload();
    }

    $csv = $this->get('/admin/customers/export')->streamedContent();
    expect($csv)->toContain("'=HYPERLINK")->toContain('+639171234567');
});

it('saves settings and uses them', function () {
    $this->actingAs(staff());

    $this->put(route('settings.update'), ['business__name' => 'New ISP', 'business__email' => 'a@b.co'])->assertSessionHasNoErrors();
    expect(Settings::get('business.name'))->toBe('New ISP');

    $this->put(route('settings.update'), ['business__name' => '', 'business__email' => 'a@b.co'])->assertSessionHasErrors('business.name');
});
