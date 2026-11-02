<?php

use App\Domain\Messenger\MessengerBot;
use App\Jobs\HandleMessengerEvent;
use App\Mail\TemplatedMail;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\MessengerConversation;
use App\Models\Ticket;
use App\Support\Settings;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    config(['services.messenger' => ['page_token' => 'tok', 'app_secret' => 'secret', 'verify_token' => 'verify', 'graph_version' => 'v23.0']]);
    Settings::put(['website.messenger_bot_enabled' => true, 'website.coverage_areas' => ['Brgy. Mabuhay']]);
    Http::fake(['graph.facebook.com/*' => Http::response(['ok' => true])]);
    Mail::fake();
});

function incoming(string $text = '', ?string $payload = null): void
{
    $message = ['mid' => uniqid(), 'text' => $text];
    if ($payload) {
        $message['quick_reply'] = ['payload' => $payload];
    }
    app(MessengerBot::class)->handle(['sender' => ['id' => 'PSID1'], 'recipient' => ['id' => 'PAGE'], 'message' => $message]);
}

function lastReply(): array
{
    $sent = Http::recorded()->map(fn ($pair) => $pair[0])->filter(fn (Request $r) => str_contains($r->url(), 'me/messages'));

    return $sent->last()?->data()['message'] ?? [];
}

function signed(array $body, string $secret = 'secret'): array
{
    $json = json_encode($body);

    return [$json, ['HTTP_X-Hub-Signature-256' => 'sha256='.hash_hmac('sha256', $json, $secret), 'CONTENT_TYPE' => 'application/json']];
}

it('answers Meta\'s verification only with the right token', function () {
    $this->get('/webhooks/messenger?hub_mode=subscribe&hub_verify_token=verify&hub_challenge=123')->assertOk()->assertSeeText('123');
    $this->get('/webhooks/messenger?hub_mode=subscribe&hub_verify_token=wrong&hub_challenge=123')->assertForbidden();
});

it('refuses verification when no token is configured', function () {
    config(['services.messenger.verify_token' => null]);

    $this->get('/webhooks/messenger?hub_mode=subscribe&hub_verify_token=&hub_challenge=123')->assertForbidden();
});

it('rejects unsigned and badly signed webhooks', function () {
    $body = ['object' => 'page', 'entry' => [['messaging' => [['sender' => ['id' => '1'], 'message' => ['mid' => 'm', 'text' => 'hi']]]]]];
    [$json, $bad] = signed($body, 'wrong');

    $this->call('POST', '/webhooks/messenger', [], [], [], ['CONTENT_TYPE' => 'application/json'], $json)->assertForbidden();
    $this->call('POST', '/webhooks/messenger', [], [], [], $bad, $json)->assertForbidden();
    Bus::assertNotDispatched(HandleMessengerEvent::class);
});

it('queues a signed message once, even if Meta sends it twice', function () {
    [$json, $headers] = signed(['object' => 'page', 'entry' => [['messaging' => [['sender' => ['id' => '1'], 'message' => ['mid' => 'same', 'text' => 'hi']]]]]]);

    $this->call('POST', '/webhooks/messenger', [], [], [], $headers, $json)->assertOk()->assertSeeText('EVENT_RECEIVED');
    $this->call('POST', '/webhooks/messenger', [], [], [], $headers, $json)->assertOk();

    Bus::assertDispatchedTimes(HandleMessengerEvent::class, 1);
});

it('understands English and Taglish questions', function (string $text, string $expected) {
    incoming($text);

    expect(lastReply()['text'])->toContain($expected);
})->with([
    ['hello', 'How can I help'],
    ['magkano po plans nyo', 'plans'],
    ['ang mabagal ng net', 'open a support ticket'],
    ['magkano bayarin ko', 'portal'],
]);

it('lists real public plans with prices', function () {
    plan(['name' => 'Home Plus', 'monthly_price' => 1299]);
    plan(['name' => 'Hidden', 'is_public' => false]);
    incoming('', 'PLANS');

    expect(lastReply()['text'])->toContain('Home Plus')->toContain('₱1,299')->not->toContain('Hidden');
});

it('checks coverage from the website list', function () {
    incoming('', 'COVERAGE');
    incoming('mabuhay');
    expect(lastReply()['text'])->toContain('we serve Brgy. Mabuhay');

    incoming('', 'COVERAGE');
    incoming('Nowhere');
    expect(lastReply()['text'])->toContain("isn't on our list");
});

it('turns a finished application into a lead and clears the stored details', function () {
    $plan = plan();
    incoming('', 'SIGNUP');
    incoming('Ana Reyes');
    incoming('not a number');
    expect(lastReply()['text'])->toContain("doesn't look like");
    incoming('09171234567');
    incoming('12 Rizal St, Brgy. Mabuhay');
    incoming('', 'PLAN_'.$plan->code);
    expect(Lead::query()->count())->toBe(0);
    incoming('', 'AGREE');

    $lead = Lead::query()->sole();
    expect($lead)->name->toBe('Ana Reyes')->source->value->toBe('facebook')->service_plan_id->toBe($plan->id)
        ->and(Customer::query()->count())->toBe(0)
        ->and(MessengerConversation::query()->sole())->state->toBe('idle')->data->toBeNull()
        ->and(lastReply()['text'])->toContain($lead->reference);
});

it('creates nothing without consent or when cancelled', function () {
    incoming('', 'SIGNUP');
    incoming('Ana Reyes');
    incoming('cancel');
    expect(MessengerConversation::query()->sole()->state)->toBe('idle');

    incoming('', 'SIGNUP');
    incoming('Ana Reyes');
    incoming('09171234567');
    incoming('12 Rizal St, Brgy. Mabuhay');
    incoming('', 'NO_PLAN');
    incoming('hmm');
    incoming('', 'CANCEL');

    expect(Lead::query()->count())->toBe(0);
});

it('never reveals account data', function () {
    $customer = customer(['first_name' => 'Secret']);
    incoming('balance ko '.$customer->mobile);

    expect(lastReply()['text'])->toContain("can't show account details")->not->toContain('Secret');
});

it('hands off to a person, stays quiet, and comes back on menu', function () {
    incoming('', 'HUMAN');
    Mail::assertQueued(TemplatedMail::class);
    $count = Http::recorded()->count();

    incoming('hello?');
    expect(Http::recorded()->count())->toBe($count);

    incoming('menu');
    expect(Http::recorded()->count())->toBe($count + 1);
});

it('steps aside when staff reply from the Page inbox, but not for its own echoes', function () {
    app(MessengerBot::class)->handle(['recipient' => ['id' => 'PSID1'], 'message' => ['is_echo' => true, 'metadata' => 'bot', 'text' => 'x']]);
    expect(MessengerConversation::query()->count())->toBe(0);

    app(MessengerBot::class)->handle(['recipient' => ['id' => 'PSID1'], 'message' => ['is_echo' => true, 'text' => 'Hi, this is Carlo']]);
    expect(MessengerConversation::query()->sole()->isPaused())->toBeTrue();
});

it('offers a person after two misunderstood messages', function () {
    incoming('asdf');
    incoming('qwer');

    expect(lastReply()['quick_replies'][0]['payload'])->toBe('HUMAN');
});

it('stays silent when switched off', function () {
    Settings::put(['website.messenger_bot_enabled' => false]);
    incoming('hello');

    Http::assertNothingSent();
});

it('respects Meta button limits', function () {
    foreach (range(1, 15) as $i) {
        plan(['name' => "A very long plan name number $i"]);
    }
    incoming('', 'SIGNUP');
    incoming('Ana Reyes');
    incoming('09171234567');
    incoming('12 Rizal St, Brgy. Mabuhay');

    $buttons = lastReply()['quick_replies'];
    expect(count($buttons))->toBeLessThanOrEqual(13);
    expect(collect($buttons)->every(fn ($b) => mb_strlen($b['title']) <= 20))->toBeTrue();
});

it('shows the chat button only when a Page is set', function () {
    $this->get('/')->assertInertia(fn (AssertableInertia $p) => $p->where('contact.messenger', null));

    Settings::put(['website.messenger_username' => 'djfiber']);
    $this->get('/')->assertInertia(fn (AssertableInertia $p) => $p->where('contact.messenger', 'https://m.me/djfiber'));
});

it('keeps the keys out of the admin page', function () {
    $this->actingAs(staff('administrator'))->get('/admin/website')->assertOk()->assertDontSee('secret')->assertInertia(fn (AssertableInertia $p) => $p->where('messenger.configured', true));
});

it('opens a ticket from Messenger after matching account and mobile', function () {
    $customer = customer(['mobile' => '0917 123 4567']);
    $subscription = activeSubscription([], $customer);
    incoming('', 'TICKET');
    incoming(strtolower($customer->reference));
    incoming('+639171234567');
    incoming('', 'CAT_no_internet');
    incoming('Red light is blinking');

    $ticket = Ticket::query()->sole();
    expect($ticket)->customer_id->toBe($customer->id)->source->toBe('messenger')->subscription_id->toBe($subscription->id)->description->toBe('Red light is blinking')
        ->and(lastReply()['text'])->toContain($ticket->number)
        ->and(MessengerConversation::query()->sole()->data)->toBeNull();
    expect(lastReply()['text'])->not->toContain($customer->first_name);
});

it('hands off after three failed matches and opens nothing', function () {
    $customer = customer();
    incoming('', 'TICKET');
    foreach (range(1, 3) as $i) {
        incoming($customer->reference);
        incoming('09990000000');
    }

    expect(Ticket::query()->count())->toBe(0)->and(MessengerConversation::query()->sole()->isPaused())->toBeTrue();
    Mail::assertQueued(TemplatedMail::class);
});
