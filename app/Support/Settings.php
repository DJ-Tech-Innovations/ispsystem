<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/** Business and billing configuration, editable from Settings. Reads are cached and fall back to these defaults. */
final class Settings
{
    private const CACHE_KEY = 'app-settings';

    public const DEFAULTS = [
        'business.name' => 'DJ Fiber Internet',
        'business.tagline' => 'ISP Management System',
        'business.email' => 'support@example.com',
        'business.phone' => '',
        'business.phone_2' => '',
        'business.address' => '',
        'business.tin' => '',
        'business.logo' => null,
        'business.logo_mark' => null,
        'billing.default_day' => null,        // null = bill on the subscription's start-date anniversary
        'billing.due_days' => 15,
        'billing.tax_rate' => 0,
        'billing.tax_label' => 'VAT',
        'billing.bill_suspended' => false,
        'billing.installation_fee_on_first_invoice' => true,
        'billing.due_reminder_days' => 3,
        'billing.overdue_reminder_days' => 3,
        'billing.invoice_footer' => '',
        'tickets.allow_reopen' => true,
        'tickets.reopen_window_days' => 7,
        'tickets.auto_close_days' => 7,
        'tickets.sla_hours_low' => 72,
        'tickets.sla_hours_normal' => 48,
        'tickets.sla_hours_high' => 24,
        'tickets.sla_hours_urgent' => 8,
        'customers.duplicate_fields' => ['mobile', 'email'],
        'notifications.email_enabled' => true,
        'notifications.sms_enabled' => false,
        'website.hero_title' => 'Internet your whole home can rely on',
        'website.hero_subtitle' => 'Fast, stable fiber from a local team that picks up the phone. Pick a plan and we will take care of the rest.',
        'website.slides' => [
            ['title' => 'Work, class and movie night, all at once', 'body' => 'Plans for busy homes, from small households to growing businesses.', 'cta_label' => 'See Plans', 'cta_url' => '#plans', 'image' => null],
            ['title' => 'Is fiber on your street yet?', 'body' => 'Type your barangay and find out in seconds.', 'cta_label' => 'Check My Area', 'cta_url' => '#coverage', 'image' => null],
            ['title' => 'Your account, right on your phone', 'body' => 'Check your balance, download receipts and report a problem from the customer portal.', 'cta_label' => 'Customer Login', 'cta_url' => '/portal/login', 'image' => null],
        ],
        'website.about_title' => 'A local internet provider, built for this community',
        'website.about_body' => "We started with a simple idea: our neighbors deserve dependable internet and support from people they can actually reach.\n\nWe install, maintain and support our own network, so when you need help you talk to the team that runs it.",
        'website.benefits' => [
            ['title' => 'Built for everyday use', 'body' => 'Work calls, classes, streaming and games, all at the same time.'],
            ['title' => 'Local support', 'body' => 'Talk to a team nearby, and follow every request with a ticket.'],
            ['title' => 'Clear monthly billing', 'body' => 'One flat monthly price, with invoices and balances in your portal.'],
            ['title' => 'Professional installation', 'body' => 'Our technicians set up and test your connection on site.'],
        ],
        'website.coverage_intro' => 'We are growing every month. If your area is not listed yet, send an inquiry and we will check for you.',
        'website.coverage_areas' => [],
        'website.faqs' => [
            ['question' => 'How do I sign up?', 'answer' => 'Send an inquiry from our Contact page. We will confirm coverage, then schedule your installation.'],
            ['question' => 'How long does installation take?', 'answer' => 'We will give you a schedule once coverage is confirmed. A technician completes the work on site.'],
            ['question' => 'How do I pay my bill?', 'answer' => 'Your invoice lists the payment options. You can see your balance and payment history in the customer portal.'],
            ['question' => 'What if my internet goes down?', 'answer' => 'Sign in to the customer portal and open a ticket, or call us. You can follow the progress from your account.'],
        ],
        'website.hours' => 'Monday to Saturday, 8:00 AM to 5:00 PM',
        'website.facebook_url' => '',
        'website.messenger_username' => '',
        'website.messenger_bot_enabled' => false,
        'website.messenger_welcome' => '',
        'website.privacy_body' => "We collect only the information we need to provide and administer your internet service, such as your name, contact details and service address.\n\nWe use it to respond to inquiries, install and support your service, and send billing and service notices. We do not sell your personal information.\n\nYou may ask to access or correct your information by contacting us.",
    ];

    /** @return array<string, mixed> */
    public static function all(): array
    {
        // Defaults sit outside the cache so a newly added setting works without a cache flush.
        return array_merge(self::DEFAULTS, Cache::rememberForever(self::CACHE_KEY, fn () => Setting::query()->pluck('value', 'key')->all()));
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }

    /** @param array<string, mixed> $values */
    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
        Cache::forget(self::CACHE_KEY);
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
