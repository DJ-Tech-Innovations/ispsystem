<?php

namespace App\Enums;

enum NotificationEvent: string
{
    use Labelled;

    case CustomerRegistered = 'customer_registered';
    case InstallationScheduled = 'installation_scheduled';
    case InstallationRescheduled = 'installation_rescheduled';
    case SubscriptionActivated = 'subscription_activated';
    case InvoiceGenerated = 'invoice_generated';
    case InvoiceDueReminder = 'invoice_due_reminder';
    case InvoiceOverdueReminder = 'invoice_overdue_reminder';
    case PaymentReceived = 'payment_received';
    case AccountSuspended = 'account_suspended';
    case TicketCreated = 'ticket_created';
    case TicketStatusUpdated = 'ticket_status_updated';
    case TicketReply = 'ticket_reply';
    case TicketCustomerUpdate = 'ticket_customer_update';
    case PortalInvitation = 'portal_invitation';
    case PlanChangeRequested = 'plan_change_requested';
    case PlanChangeApproved = 'plan_change_approved';
    case PlanChangeRejected = 'plan_change_rejected';
    case PlanChangeStaffAlert = 'plan_change_staff_alert';
}
