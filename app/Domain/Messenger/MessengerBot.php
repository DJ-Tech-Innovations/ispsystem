<?php

namespace App\Domain\Messenger;

use App\Domain\Tickets\GuestTicketIntake;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\TicketCategory;
use App\Mail\TemplatedMail;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\MessengerConversation;
use App\Models\ServicePlan;
use App\Support\Money;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

/**
 * A rules-based assistant. It only states what the system knows (plans, coverage, contact details) and never touches
 * account data, because a Messenger profile doesn't prove who someone is.
 */
class MessengerBot
{
    private const MENU = ['PLANS' => 'Plans & prices', 'COVERAGE' => 'Check my area', 'SIGNUP' => 'Apply now', 'SUPPORT' => 'Report a problem', 'HUMAN' => 'Talk to a person'];

    private const KEYWORDS = [
        'HUMAN' => '/\b(agent|human|person|staff|representative|tao|kausap)\b/',
        'UPGRADE' => '/\b(upgrade|lipat ng plan|taas ng plan|mas mabilis)\b/',
        'SIGNUP' => '/\b(apply|sign ?up|subscribe|avail|kabit|magpakabit|install|mag ?apply)\b/',
        'BILLING' => '/\b(bill|billing|balance|invoice|bayad|bayarin|payment|magbayad)\b/',
        'SUPPORT' => '/\b(down|slow|mabagal|hina|mahina|walang? (net|internet)|no (net|internet)|offline|disconnect\w*|help|tulong|problem\w*|sira)\b/',
        'PLANS' => '/\b(plans?|price|prices|pricing|magkano|presyo|rates?|mbps|speed|package)\b/',
        'COVERAGE' => '/\b(coverage|covered|area|available|meron|barangay|brgy|saan|location)\b/',
        'HOURS' => '/\b(hours?|open|oras|contact|phone|number|address|office)\b/',
        'WELCOME' => '/\b(hi|hello|hey|start|menu|kumusta|kamusta|good (morning|afternoon|evening)|magandang)\b/',
    ];

    private const TICKET_TYPES = ['CAT_no_internet' => 'No internet', 'CAT_slow_internet' => 'Slow internet', 'CAT_intermittent' => 'Keeps dropping', 'CAT_billing' => 'Billing', 'CAT_other' => 'Something else'];

    public function __construct(private MessengerClient $client, private GuestTicketIntake $intake) {}

    public function handle(array $event): void
    {
        $message = $event['message'] ?? [];

        // A staff reply from the Page inbox arrives as an echo: the person has taken over, so the bot steps aside.
        if ($message['is_echo'] ?? false) {
            if (($message['metadata'] ?? null) !== 'bot' && isset($event['recipient']['id'])) {
                MessengerConversation::query()->updateOrCreate(['psid' => $event['recipient']['id']], ['paused_until' => now()->addDay()]);
            }

            return;
        }

        $psid = $event['sender']['id'] ?? null;
        $action = $message['quick_reply']['payload'] ?? $event['postback']['payload'] ?? null;
        $text = trim((string) ($message['text'] ?? ''));

        if (! $psid || ! Settings::get('website.messenger_bot_enabled')) {
            return;
        }

        $chat = MessengerConversation::query()->firstOrCreate(['psid' => $psid]);

        if ($chat->isPaused() && mb_strtolower($text) !== 'menu') {
            return;
        }
        if ($chat->isPaused()) {
            $chat->update(['paused_until' => null]);
        }
        // A form left half-finished yesterday shouldn't swallow today's question.
        if ($chat->state !== 'idle' && $chat->updated_at->lt(now()->subDay())) {
            $chat->reset();
        }

        if ($action === null && $text === '') {
            $this->say($psid, 'Sorry, I can only read text for now. What would you like to do?', self::MENU);

            return;
        }

        if ($action !== 'CANCEL' && mb_strtolower($text) !== 'cancel' && mb_strtolower($text) !== 'menu' && $chat->state !== 'idle') {
            $this->continueFlow($chat, $action, $text);

            return;
        }

        if ($chat->state !== 'idle') {
            $chat->reset();
        }

        $this->run($chat, $action ?? $this->intent($text));
    }

    private function intent(string $text): string
    {
        $text = mb_strtolower($text);
        foreach (self::KEYWORDS as $intent => $pattern) {
            if (preg_match($pattern, $text)) {
                return $intent;
            }
        }

        return 'UNKNOWN';
    }

    private function run(MessengerConversation $chat, string $action): void
    {
        $psid = $chat->psid;
        $business = Settings::get('business.name');

        if ($action !== 'UNKNOWN') {
            $chat->update(['misses' => 0]);
        }

        match ($action) {
            'GET_STARTED', 'WELCOME', 'CANCEL' => $this->say($psid, Settings::get('website.messenger_welcome') ?: "Hi! Welcome to $business. How can I help?", self::MENU),
            'PLANS' => $this->say($psid, $this->plansText(), ['SIGNUP' => 'Apply now', 'COVERAGE' => 'Check my area', 'HUMAN' => 'Talk to a person']),
            'COVERAGE' => $this->askCoverage($chat),
            'SIGNUP' => $this->startSignup($chat),
            'BILLING' => $this->say($psid, "You can see your balance, invoices and receipts in the customer portal:\n".url('/portal/login')."\n\nFor your security, I can't show account details here.", ['HUMAN' => 'Talk to a person', 'WELCOME' => 'Main menu']),
            'SUPPORT' => $this->say($psid, 'Sorry about that! I can open a support ticket for you right here, or get someone from our team.'.$this->phoneLine(), ['TICKET' => 'Report a problem', 'HUMAN' => 'Talk to a person', 'WELCOME' => 'Main menu']),
            'TICKET' => $this->startTicket($chat),
            'UPGRADE' => $this->say($psid, "Existing subscribers can upgrade from the customer portal. Sign in, then choose Upgrade on your service:\n".url('/portal/login'), ['HUMAN' => 'Talk to a person', 'WELCOME' => 'Main menu']),
            'HOURS' => $this->say($psid, $this->contactText(), ['HUMAN' => 'Talk to a person', 'WELCOME' => 'Main menu']),
            'HUMAN' => $this->handOff($chat),
            default => $this->notUnderstood($chat),
        };
    }

    private function notUnderstood(MessengerConversation $chat): void
    {
        $chat->increment('misses');

        if ($chat->misses >= 2) {
            $chat->update(['misses' => 0]);
            $this->say($chat->psid, 'I\'m still not getting it, sorry. Would you like to talk to someone from our team?', ['HUMAN' => 'Talk to a person', 'WELCOME' => 'Main menu']);

            return;
        }

        $this->say($chat->psid, 'Sorry, I didn\'t catch that. Here\'s what I can help with:', self::MENU);
    }

    private function continueFlow(MessengerConversation $chat, ?string $action, string $text): void
    {
        $psid = $chat->psid;
        $data = $chat->data ?? [];

        switch ($chat->state) {
            case 'coverage':
                $chat->reset();
                $area = $this->findArea($text);
                $this->say($psid, $area ? "Good news, we serve $area!" : 'That area isn\'t on our list yet, but we\'re growing. Send an application and we\'ll check your exact address.', ['SIGNUP' => 'Apply now', 'PLANS' => 'Plans & prices', 'WELCOME' => 'Main menu']);
                break;

            case 'ticket_account':
                $chat->update(['state' => 'ticket_mobile', 'data' => [...$data, 'reference' => mb_substr($text, 0, 40)]]);
                $this->say($psid, 'Thanks. What mobile number is on your account?', ['CANCEL' => 'Cancel']);
                break;

            case 'ticket_mobile':
                $customer = $this->intake->verify($data['reference'] ?? '', $text);
                if (! $customer) {
                    $tries = ($data['tries'] ?? 0) + 1;
                    if ($tries >= 3) {
                        $this->handOff($chat);
                        break;
                    }
                    $chat->update(['state' => 'ticket_account', 'data' => ['tries' => $tries]]);
                    $this->say($psid, 'Those details don\'t match our records. Please send your account number again.', ['CANCEL' => 'Cancel']);
                    break;
                }
                $chat->update(['state' => 'ticket_category', 'data' => ['customer_id' => $customer->id]]);
                $this->say($psid, 'Got it. What\'s the problem?', self::TICKET_TYPES + ['CANCEL' => 'Cancel']);
                break;

            case 'ticket_category':
                $category = TicketCategory::tryFrom(substr((string) $action, 4));
                if (! $category) {
                    $this->say($psid, 'Please choose one of the options.', self::TICKET_TYPES + ['CANCEL' => 'Cancel']);
                    break;
                }
                $chat->update(['state' => 'ticket_details', 'data' => [...$data, 'category' => $category->value]]);
                $this->say($psid, 'Please describe what\'s happening.', ['CANCEL' => 'Cancel']);
                break;

            case 'ticket_details':
                if (mb_strlen($text) < 5) {
                    $this->say($psid, 'Please add a little more detail so our team can help.', ['CANCEL' => 'Cancel']);
                    break;
                }
                $ticket = $this->intake->open(Customer::query()->findOrFail($data['customer_id']), TicketCategory::from($data['category']), mb_substr($text, 0, 5000), 'messenger');
                $chat->reset();
                $this->say($psid, "Your ticket number is {$ticket->number}. Our team is on it, and you can follow it in the customer portal:\n".url('/portal/login'), ['WELCOME' => 'Main menu']);
                break;

            case 'signup_name':
                if (mb_strlen($text) < 2 || mb_strlen($text) > 150) {
                    $this->say($psid, 'Please send your full name.', ['CANCEL' => 'Cancel']);
                    break;
                }
                $chat->update(['state' => 'signup_mobile', 'data' => ['name' => $text]]);
                $this->say($psid, "Thanks! What's your mobile number?", ['CANCEL' => 'Cancel']);
                break;

            case 'signup_mobile':
                if (! preg_match('/^[0-9+()\s-]{7,30}$/', $text)) {
                    $this->say($psid, 'That doesn\'t look like a mobile number. Please try again, like 09171234567.', ['CANCEL' => 'Cancel']);
                    break;
                }
                $chat->update(['state' => 'signup_address', 'data' => [...$data, 'mobile' => $text]]);
                $this->say($psid, 'What\'s the installation address? Please include your barangay.', ['CANCEL' => 'Cancel']);
                break;

            case 'signup_address':
                if (mb_strlen($text) < 5 || mb_strlen($text) > 255) {
                    $this->say($psid, 'Please send your full address with your barangay.', ['CANCEL' => 'Cancel']);
                    break;
                }
                $chat->update(['state' => 'signup_plan', 'data' => [...$data, 'address' => $text]]);
                $this->say($psid, 'Which plan are you interested in?', $this->planButtons());
                break;

            case 'signup_plan':
                $chat->update(['state' => 'signup_consent', 'data' => [...$data, 'plan' => str_starts_with((string) $action, 'PLAN_') ? substr($action, 5) : null]]);
                $this->say($psid, 'Last step: may we contact you about this application? Our privacy notice: '.url('/privacy'), ['AGREE' => 'Yes, I agree', 'CANCEL' => 'No, cancel']);
                break;

            case 'signup_consent':
                if ($action !== 'AGREE' && ! preg_match('/^(yes|oo|opo|sige|agree)\b/i', $text)) {
                    $this->say($psid, 'Please choose an option below.', ['AGREE' => 'Yes, I agree', 'CANCEL' => 'No, cancel']);
                    break;
                }
                $this->createLead($chat, $data);
                break;

            default:
                $chat->reset();
                $this->run($chat, $action ?? $this->intent($text));
        }
    }

    private function createLead(MessengerConversation $chat, array $data): void
    {
        $lead = Lead::query()->create([
            'reference' => ReferenceNumber::next('LD'), 'name' => $data['name'], 'mobile' => $data['mobile'], 'address' => $data['address'],
            'source' => LeadSource::Facebook, 'status' => LeadStatus::New, 'notes' => 'Applied through the Messenger bot.',
            'service_plan_id' => filled($data['plan'] ?? null) ? ServicePlan::query()->where('code', $data['plan'])->where('is_public', true)->value('id') : null,
        ]);
        $chat->update(['lead_id' => $lead->id]);
        $chat->reset();

        $this->say($chat->psid, "Thank you, {$data['name']}! Your reference is {$lead->reference}. Our team will contact you soon about coverage and installation.", ['PLANS' => 'Plans & prices', 'WELCOME' => 'Main menu']);
    }

    private function handOff(MessengerConversation $chat): void
    {
        $chat->update(['paused_until' => now()->addDay(), 'state' => 'idle', 'data' => null]);
        $this->say($chat->psid, 'Okay! Someone from our team will reply here'.(Settings::get('website.hours') ? ' during business hours ('.Settings::get('website.hours').')' : '').'. Type "menu" any time to come back to me.');

        Mail::to(Settings::get('business.email'))->queue(new TemplatedMail('A Messenger customer wants to talk to someone', 'Someone asked for a person on Messenger. Please reply from your Page inbox in Meta Business Suite. The bot stays quiet in that chat for 24 hours.'));
    }

    private function askCoverage(MessengerConversation $chat): void
    {
        if (Settings::get('website.coverage_areas') === []) {
            $this->say($chat->psid, 'Send an application and we\'ll check your exact address.', ['SIGNUP' => 'Apply now', 'WELCOME' => 'Main menu']);

            return;
        }
        $chat->update(['state' => 'coverage']);
        $this->say($chat->psid, 'Sure! What\'s your barangay?', ['CANCEL' => 'Cancel']);
    }

    private function startTicket(MessengerConversation $chat): void
    {
        $chat->update(['state' => 'ticket_account', 'data' => []]);
        $this->say($chat->psid, 'What\'s your account number? It looks like CUS-000123 and is on your invoice.', ['CANCEL' => 'Cancel']);
    }

    private function startSignup(MessengerConversation $chat): void
    {
        $chat->update(['state' => 'signup_name', 'data' => []]);
        $this->say($chat->psid, 'Great! I\'ll take a few details. What\'s your full name?', ['CANCEL' => 'Cancel']);
    }

    private function findArea(string $text): ?string
    {
        $plain = fn (string $value) => trim(preg_replace('/\s+/', ' ', preg_replace('/\b(brgy|bgy|barangay)\b\.?/', '', mb_strtolower($value))));
        $term = $plain($text);

        return mb_strlen($term) < 2 ? null : collect(Settings::get('website.coverage_areas', []))->first(fn (string $area) => str_contains($plain($area), $term) || str_contains($term, $plain($area)));
    }

    private function plans(): Collection
    {
        return ServicePlan::query()->where('is_active', true)->where('is_public', true)->orderBy('sort_order')->orderBy('monthly_price')->get();
    }

    private function plansText(): string
    {
        $lines = $this->plans()->map(fn (ServicePlan $plan) => "• {$plan->name}: {$plan->speed_description}, ".str_replace('.00', '', Money::format($plan->monthly_price)).'/month');

        return $lines->isEmpty() ? 'Our plans are being updated. See '.url('/plans') : "Here are our plans:\n\n".$lines->join("\n")."\n\nDetails: ".url('/plans');
    }

    private function planButtons(): array
    {
        return $this->plans()->take(11)->mapWithKeys(fn (ServicePlan $plan) => ['PLAN_'.$plan->code => $plan->name])->all() + ['NO_PLAN' => 'Not sure yet', 'CANCEL' => 'Cancel'];
    }

    private function contactText(): string
    {
        return collect([Settings::get('business.name'), Settings::get('website.hours'), Settings::get('business.phone'), Settings::get('business.phone_2'), Settings::get('business.email'), Settings::get('business.address')])->filter()->join("\n");
    }

    private function phoneLine(): string
    {
        $phones = collect([Settings::get('business.phone'), Settings::get('business.phone_2')])->filter()->join(' / ');

        return $phones ? "\n\nCall us: $phones" : '';
    }

    private function say(string $psid, string $text, array $quickReplies = []): void
    {
        $this->client->send($psid, $text, $quickReplies);
    }
}
