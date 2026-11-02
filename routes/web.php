<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\AnnouncementController;
use App\Http\Controllers\Admin\AuditController;
use App\Http\Controllers\Admin\BillingRunController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\InstallationController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\LeadController;
use App\Http\Controllers\Admin\LookupController;
use App\Http\Controllers\Admin\MapController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\PlanChangeController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SearchController;
use App\Http\Controllers\Admin\ServicePlanController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SignOutController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\TicketController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WebsiteController;
use App\Http\Controllers\Portal\AccountController as PortalAccountController;
use App\Http\Controllers\Portal\BillingController as PortalBillingController;
use App\Http\Controllers\Portal\DashboardController as PortalDashboardController;
use App\Http\Controllers\Portal\SessionController as PortalSessionController;
use App\Http\Controllers\Portal\TicketController as PortalTicketController;
use App\Http\Controllers\Portal\UpgradeController as PortalUpgradeController;
use App\Http\Controllers\Site\SiteController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::controller(SiteController::class)->group(function () {
    Route::get('/', 'home')->name('site.home');
    Route::get('about', 'about')->name('site.about');
    Route::get('plans', 'plans')->name('site.plans');
    Route::get('coverage', 'coverage')->name('site.coverage');
    Route::get('faq', 'faq')->name('site.faq');
    Route::get('contact', 'contact')->name('site.contact');
    Route::get('privacy', 'privacy')->name('site.privacy');
    Route::post('contact', 'inquire')->middleware('throttle:inquiries')->name('site.inquire');
    Route::get('support', 'support')->name('site.support');
    Route::post('support', 'report')->middleware('throttle:support')->name('site.report');
});

Route::middleware('guest:customer')->group(function () {
    Route::get('portal/login', fn () => Inertia::render('portal/login'))->name('portal.login');
    Route::post('portal/login', [PortalSessionController::class, 'store'])->middleware('throttle:login')->name('portal.login.store');
});
Route::post('portal/logout', [PortalSessionController::class, 'destroy'])->middleware('auth:customer')->name('portal.logout');

// Takes over Fortify's route of the same name: see SignOutController.
Route::post('logout', SignOutController::class)->middleware('auth:web')->name('logout');

Route::middleware(['auth:customer', 'subscriber'])->prefix('portal')->name('portal.')->group(function () {
    Route::get('/', PortalDashboardController::class)->name('dashboard');
    Route::get('invoices', [PortalBillingController::class, 'invoices'])->name('invoices');
    Route::get('invoices/{id}', [PortalBillingController::class, 'invoice'])->name('invoice');
    Route::get('invoices/{id}/print', [PortalBillingController::class, 'printInvoice'])->name('invoice.print');
    Route::get('payments', [PortalBillingController::class, 'payments'])->name('payments');
    Route::get('payments/{id}/receipt', [PortalBillingController::class, 'receipt'])->name('receipt');
    Route::get('services/{id}/upgrade', [PortalUpgradeController::class, 'show'])->name('upgrade');
    Route::post('services/{id}/upgrade', [PortalUpgradeController::class, 'store'])->name('upgrade.store');
    Route::delete('upgrades/{id}', [PortalUpgradeController::class, 'cancel'])->name('upgrade.cancel');
    Route::get('tickets', [PortalTicketController::class, 'index'])->name('tickets');
    Route::post('tickets', [PortalTicketController::class, 'store'])->name('tickets.store');
    Route::get('tickets/{id}', [PortalTicketController::class, 'show'])->name('ticket');
    Route::post('tickets/{id}/messages', [PortalTicketController::class, 'reply'])->name('ticket.reply');
    Route::post('tickets/{id}/reopen', [PortalTicketController::class, 'reopen'])->name('ticket.reopen');
    Route::post('tickets/{id}/close', [PortalTicketController::class, 'close'])->name('ticket.close');
    Route::get('attachments/{id}', [PortalTicketController::class, 'attachment'])->name('attachment');
    Route::get('account', [PortalAccountController::class, 'edit'])->name('account');
    Route::put('account', [PortalAccountController::class, 'update'])->name('account.update');
    Route::put('account/preferences', [PortalAccountController::class, 'preferences'])->name('account.preferences');
    Route::put('account/password', [PortalAccountController::class, 'password'])->name('account.password');
});

Route::middleware(['auth:web', 'staff'])->prefix('admin')->group(function () {
    Route::get('/', DashboardController::class)->middleware('permission:dashboard.view')->name('dashboard');
    Route::get('search', SearchController::class)->name('search');
    Route::get('lookup/customers', [LookupController::class, 'customers'])->name('lookup.customers');

    Route::get('account', [AccountController::class, 'edit'])->name('account');
    Route::put('account', [AccountController::class, 'update'])->name('account.update');
    Route::put('account/password', [AccountController::class, 'password'])->name('account.password');

    Route::get('leads/export', [LeadController::class, 'export'])->middleware('permission:leads.export')->name('leads.export');
    Route::get('leads', [LeadController::class, 'index'])->middleware('permission:leads.view')->name('leads.index');
    Route::post('leads', [LeadController::class, 'store'])->middleware('permission:leads.create')->name('leads.store');
    Route::put('leads/{lead}', [LeadController::class, 'update'])->middleware('permission:leads.edit')->name('leads.update');
    Route::put('leads/{lead}/status', [LeadController::class, 'status'])->middleware('permission:leads.edit')->name('leads.status');
    Route::post('leads/{lead}/convert', [LeadController::class, 'convert'])->middleware('permission:leads.convert')->name('leads.convert');
    Route::delete('leads/{lead}', [LeadController::class, 'destroy'])->middleware('permission:leads.delete')->name('leads.destroy');

    Route::get('customers/export', [CustomerController::class, 'export'])->middleware('permission:customers.export')->name('customers.export');
    Route::get('customers', [CustomerController::class, 'index'])->middleware('permission:customers.view')->name('customers.index');
    Route::post('customers', [CustomerController::class, 'store'])->middleware('permission:customers.create')->name('customers.store');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:customers.view')->name('customers.show');
    Route::put('customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:customers.edit')->name('customers.update');
    Route::put('customers/{customer}/status', [CustomerController::class, 'status'])->middleware('permission:customers.change_status')->name('customers.status');
    Route::post('customers/{customer}/interactions', [CustomerController::class, 'interaction'])->middleware('permission:customers.edit')->name('customers.interactions');
    Route::put('customers/{customer}/preferences', [CustomerController::class, 'preferences'])->middleware('permission:customers.edit')->name('customers.preferences');
    Route::put('customers/{customer}/location', [CustomerController::class, 'location'])->middleware('permission:customers.geotag')->name('customers.location');
    Route::delete('customers/{customer}/location', [CustomerController::class, 'clearLocation'])->middleware('permission:customers.geotag')->name('customers.location.clear');
    Route::get('map', MapController::class)->middleware('permission:customers.map')->name('map');
    Route::post('customers/{customer}/portal', [CustomerController::class, 'invite'])->middleware('permission:customers.portal')->name('customers.portal.invite');
    Route::delete('customers/{customer}/portal', [CustomerController::class, 'revokePortal'])->middleware('permission:customers.portal')->name('customers.portal.revoke');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:customers.delete')->name('customers.destroy');

    Route::get('plans', [ServicePlanController::class, 'index'])->middleware('permission:plans.view')->name('plans.index');
    Route::middleware('permission:plans.manage')->group(function () {
        Route::post('plans', [ServicePlanController::class, 'store'])->name('plans.store');
        Route::put('plans/{plan}', [ServicePlanController::class, 'update'])->name('plans.update');
        Route::delete('plans/{plan}', [ServicePlanController::class, 'destroy'])->name('plans.destroy');
    });

    Route::get('subscriptions/export', [SubscriptionController::class, 'export'])->middleware('permission:subscriptions.export')->name('subscriptions.export');
    Route::get('subscriptions', [SubscriptionController::class, 'index'])->middleware('permission:subscriptions.view')->name('subscriptions.index');
    Route::post('subscriptions', [SubscriptionController::class, 'store'])->middleware('permission:subscriptions.create')->name('subscriptions.store');
    Route::get('subscriptions/{subscription}', [SubscriptionController::class, 'show'])->middleware('permission:subscriptions.view')->name('subscriptions.show');
    Route::put('subscriptions/{subscription}', [SubscriptionController::class, 'update'])->middleware('permission:subscriptions.edit')->name('subscriptions.update');
    // Each target status needs its own permission, checked in the controller.
    Route::put('subscriptions/{subscription}/status', [SubscriptionController::class, 'status'])->middleware('permission:subscriptions.view')->name('subscriptions.status');

    Route::get('plan-upgrades', [PlanChangeController::class, 'index'])->middleware('permission:plan_changes.view')->name('plan-changes.index');
    Route::post('plan-upgrades/{change}/approve', [PlanChangeController::class, 'approve'])->middleware('permission:plan_changes.approve')->name('plan-changes.approve');
    Route::post('plan-upgrades/{change}/reject', [PlanChangeController::class, 'reject'])->middleware('permission:plan_changes.approve')->name('plan-changes.reject');

    Route::get('installations', [InstallationController::class, 'index'])->middleware('permission:installations.view')->name('installations.index');
    Route::post('installations', [InstallationController::class, 'store'])->middleware('permission:installations.create')->name('installations.store');
    Route::get('installations/{installation}', [InstallationController::class, 'show'])->middleware('permission:installations.view')->name('installations.show');
    Route::put('installations/{installation}', [InstallationController::class, 'update'])->middleware('permission:installations.edit')->name('installations.update');
    Route::put('installations/{installation}/progress', [InstallationController::class, 'progress'])->middleware('permission:installations.update_progress')->name('installations.progress');
    Route::put('installations/{installation}/location', [InstallationController::class, 'location'])->middleware('permission:installations.update_progress')->name('installations.location');
    Route::post('installations/{installation}/confirm', [InstallationController::class, 'confirm'])->middleware('permission:installations.confirm')->name('installations.confirm');
    Route::post('installations/{installation}/attachment', [InstallationController::class, 'attachment'])->middleware('permission:installations.update_progress')->name('installations.attachment');
    Route::get('installations/{installation}/attachment', [InstallationController::class, 'download'])->middleware('permission:installations.view')->name('installations.download');

    Route::get('invoices/export', [InvoiceController::class, 'export'])->middleware('permission:invoices.export')->name('invoices.export');
    Route::get('invoices', [InvoiceController::class, 'index'])->middleware('permission:invoices.view')->name('invoices.index');
    Route::get('invoices/create', [InvoiceController::class, 'create'])->middleware('permission:invoices.create')->name('invoices.create');
    Route::post('invoices', [InvoiceController::class, 'store'])->middleware('permission:invoices.create')->name('invoices.store');
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show'])->middleware('permission:invoices.view')->name('invoices.show');
    Route::get('invoices/{invoice}/print', [InvoiceController::class, 'print'])->middleware('permission:invoices.view')->name('invoices.print');
    Route::get('invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->middleware('permission:invoices.adjust')->name('invoices.edit');
    Route::put('invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:invoices.adjust')->name('invoices.update');
    Route::post('invoices/{invoice}/issue', [InvoiceController::class, 'issue'])->middleware('permission:invoices.adjust')->name('invoices.issue');
    Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void'])->middleware('permission:invoices.void')->name('invoices.void');

    Route::get('billing', [BillingRunController::class, 'index'])->middleware('permission:billing.view_runs')->name('billing.index');
    Route::post('billing', [BillingRunController::class, 'store'])->middleware('permission:billing.run')->name('billing.store');

    Route::get('payments/export', [PaymentController::class, 'export'])->middleware('permission:payments.export')->name('payments.export');
    Route::get('payments', [PaymentController::class, 'index'])->middleware('permission:payments.view')->name('payments.index');
    Route::post('payments', [PaymentController::class, 'store'])->middleware('permission:payments.create')->name('payments.store');
    Route::get('payments/{payment}', [PaymentController::class, 'show'])->middleware('permission:payments.view')->name('payments.show');
    Route::get('payments/{payment}/receipt', [PaymentController::class, 'receipt'])->middleware('permission:payments.view')->name('payments.receipt');
    Route::get('payments/{payment}/proof', [PaymentController::class, 'proof'])->middleware('permission:payments.view')->name('payments.proof');
    Route::post('payments/{payment}/reverse', [PaymentController::class, 'reverse'])->middleware('permission:payments.reverse')->name('payments.reverse');

    Route::get('tickets/export', [TicketController::class, 'export'])->middleware('permission:tickets.export')->name('tickets.export');
    Route::get('tickets', [TicketController::class, 'index'])->middleware('permission:tickets.view')->name('tickets.index');
    Route::post('tickets', [TicketController::class, 'store'])->middleware('permission:tickets.create')->name('tickets.store');
    Route::get('tickets/attachments/{attachment}', [TicketController::class, 'attachment'])->middleware('permission:tickets.view')->name('tickets.attachment');
    Route::get('tickets/{ticket}', [TicketController::class, 'show'])->middleware('permission:tickets.view')->name('tickets.show');
    Route::put('tickets/{ticket}', [TicketController::class, 'update'])->middleware('permission:tickets.edit')->name('tickets.update');
    Route::put('tickets/{ticket}/assign', [TicketController::class, 'assign'])->middleware('permission:tickets.assign')->name('tickets.assign');
    Route::put('tickets/{ticket}/status', [TicketController::class, 'status'])->middleware('permission:tickets.update_status')->name('tickets.status');
    Route::post('tickets/{ticket}/reopen', [TicketController::class, 'reopen'])->middleware('permission:tickets.update_status')->name('tickets.reopen');
    // Public reply vs internal note is checked in the controller.
    Route::post('tickets/{ticket}/messages', [TicketController::class, 'reply'])->middleware('permission:tickets.reply|tickets.internal_notes')->name('tickets.reply');

    Route::get('announcements', [AnnouncementController::class, 'index'])->middleware('permission:announcements.view')->name('announcements.index');
    Route::middleware('permission:announcements.manage')->group(function () {
        Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::put('announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });

    Route::get('reports', [ReportController::class, 'index'])->middleware('permission:reports.view')->name('reports.index');

    Route::get('notifications', [NotificationController::class, 'logs'])->middleware('permission:notifications.view')->name('notifications.logs');
    Route::post('notifications/{log}/retry', [NotificationController::class, 'retry'])->middleware('permission:notifications.retry')->name('notifications.retry');
    Route::get('notification-templates', [NotificationController::class, 'templates'])->middleware('permission:notifications.templates')->name('notifications.templates');
    Route::put('notification-templates/{template}', [NotificationController::class, 'updateTemplate'])->middleware('permission:notifications.templates')->name('notifications.templates.update');

    Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view')->name('users.index');
    Route::middleware('permission:users.manage')->group(function () {
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::put('users/{user}/toggle', [UserController::class, 'toggle'])->name('users.toggle');
    });

    Route::middleware('permission:roles.manage')->group(function () {
        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    });

    Route::get('audit-trail', [AuditController::class, 'index'])->middleware('permission:audit.view')->name('audit.index');

    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
        Route::put('settings', [SettingController::class, 'update'])->name('settings.update');
        Route::post('settings/logo', [SettingController::class, 'logo'])->name('settings.logo');
    });

    Route::middleware('permission:website.manage')->group(function () {
        Route::get('website', [WebsiteController::class, 'index'])->name('website.index');
        Route::put('website', [WebsiteController::class, 'update'])->name('website.update');
        Route::post('website/slide-image', [WebsiteController::class, 'slideImage'])->name('website.slide-image');
    });
});

// Inside the web group, so 404 pages have the session and shared props the layouts need.
Route::fallback(fn () => abort(404));
