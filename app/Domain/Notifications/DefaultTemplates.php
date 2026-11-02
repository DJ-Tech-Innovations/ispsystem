<?php

namespace App\Domain\Notifications;

final class DefaultTemplates
{
    /** @return array<string, array{0: string, 1: string, 2: list<string>}> event => [subject, body, extra placeholders] */
    public static function email(): array
    {
        return [
            'customer_registered' => ['Welcome to {{business_name}}', "Hi {{customer_name}},\n\nThank you for registering with {{business_name}}. Your customer reference is {{customer_reference}}.\n\nWe'll be in touch about the next steps.", []],
            'installation_scheduled' => ['Your installation is scheduled', "Hi {{customer_name}},\n\nYour installation ({{installation_reference}}) is scheduled for {{schedule}} at {{address}}.\n\nPlease make sure someone is available at the location.", ['installation_reference', 'schedule', 'address']],
            'installation_rescheduled' => ['Your installation was rescheduled', "Hi {{customer_name}},\n\nYour installation ({{installation_reference}}) has moved to {{schedule}}.\n\nWe're sorry for any inconvenience.", ['installation_reference', 'schedule', 'address']],
            'subscription_activated' => ['Your internet service is active', "Hi {{customer_name}},\n\nGood news: your {{plan_name}} subscription ({{subscription_reference}}) is now active. Welcome aboard!", ['subscription_reference', 'plan_name']],
            'invoice_generated' => ['Invoice {{invoice_number}} is ready', "Hi {{customer_name}},\n\nInvoice {{invoice_number}} for {{amount}} is ready and due on {{due_date}}.", ['invoice_number', 'amount', 'due_date']],
            'invoice_due_reminder' => ['Invoice {{invoice_number}} is due soon', "Hi {{customer_name}},\n\nA reminder that {{amount}} on invoice {{invoice_number}} is due on {{due_date}}.\n\nPlease disregard this if you have already paid.", ['invoice_number', 'amount', 'due_date']],
            'invoice_overdue_reminder' => ['Invoice {{invoice_number}} is overdue', "Hi {{customer_name}},\n\nInvoice {{invoice_number}} was due on {{due_date}} and {{amount}} is still outstanding. Please settle it to avoid interruption of your service.", ['invoice_number', 'amount', 'due_date']],
            'payment_received' => ['Payment received, thank you', "Hi {{customer_name}},\n\nWe received {{amount}} for invoice {{invoice_number}} (receipt {{payment_reference}}). Your remaining balance on this invoice is {{balance}}.", ['payment_reference', 'invoice_number', 'amount', 'balance']],
            'account_suspended' => ['Your service was suspended', "Hi {{customer_name}},\n\nSubscription {{subscription_reference}} has been suspended. Reason: {{reason}}\n\nPlease contact us at {{business_phone}} to restore your service.", ['subscription_reference', 'reason']],
            'ticket_created' => ['Ticket {{ticket_number}}: {{ticket_subject}}', "Hi {{customer_name}},\n\nWe received your request and opened ticket {{ticket_number}}. Our team will get back to you shortly.", ['ticket_number', 'ticket_subject']],
            'ticket_status_updated' => ['Ticket {{ticket_number}} update', "Hi {{customer_name}},\n\nThe status of ticket {{ticket_number}} is now: {{status}}.", ['ticket_number', 'ticket_subject', 'status']],
            'ticket_customer_update' => ['{{customer_name}} updated ticket {{ticket_number}}', "{{customer_name}} ({{customer_reference}}) wrote on ticket {{ticket_number}}, {{ticket_subject}}:\n\n{{message}}", ['ticket_number', 'ticket_subject', 'message']],
            'portal_invitation' => ['Your {{business_name}} customer portal', "Hi {{customer_name}},\n\nYou can now view your invoices, payments and support tickets online.\n\nSet your password here to get started:\n{{activation_url}}", ['activation_url']],
            'plan_change_requested' => ['We received your upgrade request', "Hi {{customer_name}},\n\nWe received your request ({{request_reference}}) to move to {{plan_name}} at {{new_amount}} a month. We will let you know once it is reviewed.", ['request_reference', 'plan_name', 'plan_speed', 'new_amount', 'next_billing_date']],
            'plan_change_approved' => ['Your upgrade to {{plan_name}} is approved', "Hi {{customer_name}},\n\nGood news: your upgrade to {{plan_name}} ({{plan_speed}}) is approved. Your new monthly price of {{new_amount}} starts with your bill on {{next_billing_date}}.", ['request_reference', 'plan_name', 'plan_speed', 'new_amount', 'next_billing_date']],
            'plan_change_rejected' => ['About your upgrade request', "Hi {{customer_name}},\n\nWe could not approve your request ({{request_reference}}) to move to {{plan_name}}.\n\nReason: {{reason}}\n\nPlease contact us at {{business_phone}} if you have questions.", ['request_reference', 'plan_name', 'plan_speed', 'new_amount', 'next_billing_date', 'reason']],
            'plan_change_staff_alert' => ['{{customer_name}} asked to upgrade to {{plan_name}}', '{{customer_name}} ({{customer_reference}}) requested {{plan_name}} at {{new_amount}} a month. Reference {{request_reference}}. Review it under Plan Upgrades in the admin.', ['request_reference', 'plan_name', 'plan_speed', 'new_amount', 'next_billing_date']],
            'ticket_reply' => ['New reply on ticket {{ticket_number}}', "Hi {{customer_name}},\n\nOur team replied to ticket {{ticket_number}}:\n\n{{reply}}", ['ticket_number', 'ticket_subject', 'reply']],
        ];
    }
}
