<?php

namespace App\Domain\Notifications;

use App\Enums\NotificationEvent;
use App\Jobs\DeliverNotification;
use App\Models\Customer;
use App\Models\NotificationLog;
use App\Models\NotificationTemplate;
use App\Support\Settings;

/**
 * Turns a business event into queued messages: one log row per channel, delivered by a job after commit so a
 * rolled-back invoice or payment never emails anyone. Internal ticket notes have no event here by design.
 */
class NotificationDispatcher
{
    /** A message about a customer that goes to staff, so that customer's own preferences don't apply. */
    public function sendToStaff(NotificationEvent $event, Customer $customer, string $recipient, array $context = []): void
    {
        $this->send($event, $customer, $context, $recipient);
    }

    public function send(NotificationEvent $event, Customer $customer, array $context = [], ?string $staffRecipient = null): void
    {
        $templates = NotificationTemplate::query()->where('event', $event->value)->where('is_enabled', true)->get();

        foreach ($templates as $template) {
            $recipient = $staffRecipient ?? ($template->channel === 'sms' ? $customer->mobile : $customer->email);

            if (blank($recipient) || ! Settings::get("notifications.{$template->channel}_enabled") || (! $staffRecipient && ! $customer->wantsChannel($template->channel))) {
                continue;
            }

            $values = $this->values($customer, $context);
            $log = NotificationLog::query()->create([
                'customer_id' => $customer->id,
                'event' => $event->value,
                'channel' => $template->channel,
                'recipient' => $recipient,
                'subject' => $template->subject ? $this->render($template->subject, $values) : null,
                'body' => $this->render($template->body, $values),
            ]);

            DeliverNotification::dispatch($log->id)->afterCommit();
        }
    }

    public function render(string $text, array $values): string
    {
        return (string) preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', fn (array $match) => (string) ($values[$match[1]] ?? ''), $text);
    }

    private function values(Customer $customer, array $context): array
    {
        return [
            'customer_name' => $customer->name,
            'customer_reference' => $customer->reference,
            'business_name' => Settings::get('business.name'),
            'business_phone' => Settings::get('business.phone'),
            'business_email' => Settings::get('business.email'),
            ...$context,
        ];
    }
}
