<?php

namespace App\Support;

/**
 * The single source of truth for permissions (`<feature>.<action>`). Adding one here makes it appear on the Roles page
 * and lets the seeder grant it. Routes must name a permission listed here (see RoutePermissionCoverageTest).
 */
final class PermissionCatalog
{
    public const OWNER = 'owner';

    /** @return array<string, array<string, string>> group => [permission => description] */
    public static function groups(): array
    {
        return [
            'Dashboard' => [
                'dashboard.view' => 'See the operations dashboard',
                'dashboard.financials' => 'See money figures on the dashboard',
            ],
            'Leads' => [
                'leads.view' => 'View leads and inquiries',
                'leads.create' => 'Add leads',
                'leads.edit' => 'Edit leads and move them through the pipeline',
                'leads.convert' => 'Convert leads into customers',
                'leads.delete' => 'Delete leads',
                'leads.export' => 'Export leads to CSV',
            ],
            'Customers' => [
                'customers.view' => 'View customer records',
                'customers.create' => 'Register customers',
                'customers.edit' => 'Edit customer details and log interactions',
                'customers.change_status' => 'Change a customer\'s account status',
                'customers.portal' => 'Invite customers to the portal and revoke access',
                'customers.geotag' => 'Place and change the map pin on a customer address',
                'customers.map' => 'See all customers on the map',
                'customers.delete' => 'Archive customers with no service or billing records',
                'customers.export' => 'Export customers to CSV',
            ],
            'Service Plans' => [
                'plans.view' => 'View service plans',
                'plans.manage' => 'Create, edit and archive service plans',
            ],
            'Subscriptions' => [
                'subscriptions.view' => 'View subscriptions',
                'subscriptions.create' => 'Create subscriptions',
                'subscriptions.edit' => 'Edit subscription details and agreed price',
                'subscriptions.activate' => 'Activate subscriptions and reconnect suspended ones',
                'subscriptions.suspend' => 'Suspend subscriptions',
                'subscriptions.terminate' => 'Terminate or cancel subscriptions',
                'subscriptions.export' => 'Export subscriptions to CSV',
            ],
            'Plan Upgrades' => [
                'plan_changes.view' => 'View customer upgrade requests',
                'plan_changes.approve' => 'Approve or reject upgrade requests',
            ],
            'Installations' => [
                'installations.view' => 'View installation jobs assigned to you',
                'installations.view_all' => 'View every installation job',
                'installations.create' => 'Create installation jobs',
                'installations.edit' => 'Schedule and assign installation jobs',
                'installations.update_progress' => 'Update progress on jobs you can see',
                'installations.confirm' => 'Confirm completed installations',
            ],
            'Billing' => [
                'invoices.view' => 'View invoices',
                'invoices.create' => 'Create manual invoices',
                'invoices.adjust' => 'Edit draft invoices and issue them',
                'invoices.void' => 'Void invoices',
                'invoices.export' => 'Export invoices to CSV',
                'billing.view_runs' => 'See billing run history',
                'billing.run' => 'Run invoice generation manually',
            ],
            'Payments' => [
                'payments.view' => 'View payments and receipts',
                'payments.create' => 'Record payments',
                'payments.reverse' => 'Reverse payments',
                'payments.export' => 'Export payments to CSV',
            ],
            'Tickets' => [
                'tickets.view' => 'View tickets assigned to you',
                'tickets.view_all' => 'View every ticket',
                'tickets.create' => 'Create tickets for customers',
                'tickets.edit' => 'Edit ticket details, status and priority',
                'tickets.update_status' => 'Change the status of tickets you can see',
                'tickets.assign' => 'Assign tickets to staff',
                'tickets.reply' => 'Reply to customers',
                'tickets.internal_notes' => 'Read and write internal notes',
                'tickets.export' => 'Export tickets to CSV',
            ],
            'Notifications' => [
                'notifications.view' => 'View the notification log',
                'notifications.retry' => 'Retry failed notifications',
                'notifications.templates' => 'Edit notification templates',
            ],
            'Announcements' => [
                'announcements.view' => 'View announcements',
                'announcements.manage' => 'Create, publish and delete announcements',
            ],
            'Website' => [
                'website.manage' => 'Edit public website content',
            ],
            'Reports' => [
                'reports.view' => 'View collection and aging reports',
            ],
            'Administration' => [
                'users.view' => 'View staff accounts',
                'users.manage' => 'Create, edit and deactivate staff accounts',
                'roles.manage' => 'Manage roles and their permissions',
                'audit.view' => 'View the audit trail',
                'settings.manage' => 'Change business, billing and system settings',
            ],
        ];
    }

    /** @return list<string> */
    public static function all(): array
    {
        return array_keys(array_merge(...array_values(self::groups())));
    }

    /** Default grants per seeded role. Owner bypasses checks entirely, so it needs no list. */
    public static function defaultRoles(): array
    {
        $everything = self::all();

        return [
            'administrator' => array_values(array_diff($everything, ['roles.manage', 'settings.manage', 'users.manage'])),
            'billing' => [
                'dashboard.view', 'dashboard.financials', 'customers.view', 'plans.view', 'subscriptions.view', 'plan_changes.view', 'plan_changes.approve',
                'invoices.view', 'invoices.create', 'invoices.adjust', 'invoices.void', 'invoices.export',
                'billing.view_runs', 'billing.run', 'payments.view', 'payments.create', 'payments.reverse', 'payments.export',
                'reports.view', 'notifications.view',
            ],
            'customer_service' => [
                'dashboard.view', 'leads.view', 'leads.create', 'leads.edit', 'leads.convert', 'leads.export',
                'customers.view', 'customers.create', 'customers.edit', 'customers.portal', 'customers.geotag', 'customers.map', 'customers.export', 'plans.view',
                'subscriptions.view', 'subscriptions.create', 'plan_changes.view', 'installations.view', 'installations.view_all', 'installations.create',
                'tickets.view', 'tickets.view_all', 'tickets.create', 'tickets.edit', 'tickets.update_status', 'tickets.assign', 'tickets.reply', 'tickets.internal_notes',
                'announcements.view',
            ],
            'technician' => [
                'dashboard.view', 'installations.view', 'installations.update_progress', 'tickets.view', 'tickets.update_status', 'tickets.reply', 'tickets.internal_notes',
            ],
        ];
    }

    public static function roleLabel(string $role): string
    {
        return ['owner' => 'Owner / Super Admin', 'administrator' => 'Administrator', 'billing' => 'Billing Staff',
            'customer_service' => 'Customer Service', 'technician' => 'Technician'][$role] ?? str($role)->replace('_', ' ')->title()->toString();
    }
}
