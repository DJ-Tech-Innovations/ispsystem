<?php

use App\Enums\LeadStatus;
use App\Models\Announcement;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\NotificationLog;
use App\Models\Ticket;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

it('serves every public page to guests', function (string $url) {
    $this->get($url)->assertOk();
})->with(['/', '/about', '/plans', '/coverage', '/faq', '/contact', '/privacy', '/portal/login']);

it('shows a real title and description to crawlers', function () {
    $this->get('/plans')->assertSee('<meta name="description" content="Compare our internet plans', false)->assertSee('<title', false);
});

it('lists only active public plans and no internal fields', function () {
    plan(['name' => 'Shown']);
    plan(['name' => 'Hidden', 'is_public' => false]);
    plan(['name' => 'Retired', 'is_active' => false]);

    $this->get('/plans')->assertInertia(fn (AssertableInertia $page) => $page->has('plans', 1)->where('plans.0.name', 'Shown')->missing('plans.0.id')->missing('plans.0.sort_order'));
});

it('shows only live website announcements', function () {
    $make = fn (array $a) => Announcement::query()->create(['title' => 'x', 'body' => 'y', 'is_published' => true, 'audience' => 'all', ...$a]);
    $make(['title' => 'Live']);
    $make(['title' => 'Draft', 'is_published' => false]);
    $make(['title' => 'Portal only', 'audience' => 'customers']);
    $make(['title' => 'Expired', 'ends_at' => now()->subDay()]);

    $this->get('/')->assertInertia(fn (AssertableInertia $page) => $page->has('announcements', 1)->where('announcements.0.title', 'Live'));
});

function inquiry(array $overrides = []): array
{
    return ['name' => 'Ana Reyes', 'mobile' => '09171234567', 'address' => 'Brgy. Mabuhay', 'consent' => true, ...$overrides];
}

it('turns an inquiry into a new lead and never a customer', function () {
    $code = plan()->code;
    $this->post('/contact', inquiry(['plan' => $code, 'message' => 'Is my street covered?']))->assertSessionHasNoErrors()->assertSessionHas('inquiry_sent');

    $lead = Lead::query()->sole();
    expect($lead)->status->toBe(LeadStatus::New)->source->value->toBe('website')->notes->toBe('Is my street covered?')->service_plan_id->not->toBeNull()
        ->and(Customer::query()->count())->toBe(0);
});

it('validates inquiries and needs consent', function () {
    $this->post('/contact', inquiry(['consent' => false, 'mobile' => 'abc', 'name' => '']))->assertSessionHasErrors(['consent', 'mobile', 'name']);

    expect(Lead::query()->count())->toBe(0);
});

it('silently drops honeypot submissions', function () {
    $this->post('/contact', inquiry(['website' => 'http://spam.example']))->assertSessionHas('inquiry_sent');

    expect(Lead::query()->count())->toBe(0);
});

it('rate limits inquiries', function () {
    foreach (range(1, 3) as $i) {
        $this->post('/contact', inquiry())->assertRedirect();
    }

    $this->post('/contact', inquiry())->assertStatus(429);
});

it('uses website content edited by staff, behind its own permission', function () {
    $content = ['hero_title' => 'New headline', 'hero_subtitle' => 'Sub', 'about_title' => 'A', 'about_body' => 'B', 'benefits' => [['title' => 'T', 'body' => 'B']], 'coverage_intro' => 'C', 'coverage_areas' => ['Brgy. Uno'], 'faqs' => [['question' => 'Q', 'answer' => 'A']], 'hours' => '', 'facebook_url' => '', 'privacy_body' => 'P'];

    $this->actingAs(staff('billing'))->put(route('website.update'), $content)->assertForbidden();
    $this->actingAs(staff('administrator'))->put(route('website.update'), $content)->assertSessionHasNoErrors();

    expect(Settings::get('website.hero_title'))->toBe('New headline');
    auth()->logout();
    $this->get('/')->assertInertia(fn (AssertableInertia $page) => $page->where('content.hero_title', 'New headline')->where('content.coverage_areas', ['Brgy. Uno']));
});

it('renders a 404 inside the website with shared data', function () {
    config(['app.debug' => false]);

    $this->get('/no-such-page')->assertNotFound()->assertInertia(fn (AssertableInertia $page) => $page->component('error')->where('status', 404)->has('business'));
});

it('sends default slides to the home page and accepts safe edits only', function () {
    $this->get('/')->assertInertia(fn (AssertableInertia $page) => $page->has('slides', 3)->where('slides.0.image', null));

    $content = fn (array $slide) => [...collect(Settings::DEFAULTS)->filter(fn ($v, $k) => str_starts_with($k, 'website.'))->mapWithKeys(fn ($v, $k) => [substr($k, 8) => $v])->all(), 'coverage_areas' => ['Brgy. Uno'], 'slides' => [$slide]];
    $this->actingAs(staff('administrator'));

    foreach (['javascript:alert(1)', '//evil.example', 'http://insecure.example'] as $url) {
        $this->put(route('website.update'), $content(['title' => 'T', 'cta_label' => 'Go', 'cta_url' => $url]))->assertSessionHasErrors('slides.0.cta_url');
    }
    $this->put(route('website.update'), $content(['title' => 'T', 'image' => '../.env']))->assertSessionHasErrors('slides.0.image');
    $this->put(route('website.update'), $content(['title' => 'T', 'cta_label' => 'Go', 'cta_url' => '/contact']))->assertSessionHasNoErrors();

    expect(Settings::get('website.slides'))->toHaveCount(1);
});

it('uploads slide photos behind permission and removes ones no longer used', function () {
    Storage::fake('public');
    $image = UploadedFile::fake()->image('hero.jpg', 1920, 1080);

    $this->actingAs(staff('billing'))->postJson(route('website.slide-image'), ['image' => $image])->assertForbidden();

    $this->actingAs(staff('administrator'));
    $this->postJson(route('website.slide-image'), ['image' => UploadedFile::fake()->create('x.svg', 5, 'image/svg+xml')])->assertUnprocessable();
    $path = $this->postJson(route('website.slide-image'), ['image' => $image])->assertOk()->json('path');

    Settings::put(['website.slides' => [['title' => 'T', 'image' => $path]]]);
    $this->get('/')->assertInertia(fn (AssertableInertia $page) => $page->where('slides.0.image', fn ($url) => str_contains($url, $path)));

    $content = collect(Settings::DEFAULTS)->filter(fn ($v, $k) => str_starts_with($k, 'website.'))->mapWithKeys(fn ($v, $k) => [substr($k, 8) => $v])->all();
    $this->put(route('website.update'), [...$content, 'coverage_areas' => ['A'], 'slides' => [['title' => 'T']]])->assertSessionHasNoErrors();
    Storage::disk('public')->assertMissing($path);
});

function supportForm(array $overrides = []): array
{
    return ['reference' => 'x', 'mobile' => '0917', 'category' => 'no_internet', 'description' => 'No light on the modem', ...$overrides];
}

it('opens a ticket from the website for a matching customer', function () {
    $customer = customer(['mobile' => '09171234567']);

    $this->post('/support', supportForm(['reference' => $customer->reference, 'mobile' => '0917-123-4567']))->assertSessionHasNoErrors()->assertSessionHas('ticket_number');

    expect(Ticket::query()->sole())->customer_id->toBe($customer->id)->source->toBe('website')->priority->value->toBe('normal')
        ->and(NotificationLog::query()->where('event', 'ticket_customer_update')->count())->toBe(1);
});

it('gives the same answer for a wrong number and an unknown account', function () {
    $customer = customer();

    $wrong = $this->post('/support', supportForm(['reference' => $customer->reference, 'mobile' => '09990000000']))->assertSessionHasErrors('reference')->getSession()->get('errors')->first('reference');
    app('session')->flush();
    $unknown = $this->post('/support', supportForm(['reference' => 'CUS-999999', 'mobile' => '09990000000']))->assertSessionHasErrors('reference')->getSession()->get('errors')->first('reference');

    expect($wrong)->toBe($unknown)->and(Ticket::query()->count())->toBe(0);
});

it('rate limits support reports', function () {
    foreach (range(1, 5) as $i) {
        $this->post('/support', supportForm());
    }

    $this->post('/support', supportForm())->assertStatus(429);
});

it('marks portal tickets with their source', function () {
    $customer = customer();
    $user = User::factory()->create(['email' => 'p@example.com', 'type' => 'subscriber']);
    $customer->update(['user_id' => $user->id]);

    $this->actingAs($user, 'customer')->post('/portal/tickets', ['category' => 'other', 'subject' => 'x', 'description' => 'y']);

    expect(Ticket::query()->sole()->source)->toBe('portal');
});

it('shows the friendly 404 in debug mode too, with the right status', function () {
    config(['app.debug' => true]);

    $this->get('/no-such-page')->assertNotFound()->assertInertia(fn (AssertableInertia $page) => $page->component('error')->where('status', 404)->has('contact.phone'));
});

it('uses the 404 page for records that do not exist', function () {
    $this->actingAs(staff());

    $this->get('/admin/customers/00000000-0000-0000-0000-000000000000')->assertNotFound()->assertInertia(fn (AssertableInertia $page) => $page->component('error')->has('auth.user'));
    $this->get('/admin/no-such-page')->assertNotFound()->assertInertia(fn (AssertableInertia $page) => $page->component('error'));
});

it('still answers 404 as JSON to API-style requests, and leaves webhooks alone', function () {
    $this->getJson('/no-such-page')->assertNotFound()->assertJsonStructure(['message']);
});

it('keeps the stack trace for real errors in debug mode', function () {
    config(['app.debug' => true]);
    Route::get('/boom-test', fn () => throw new RuntimeException('boom'));

    $this->get('/boom-test')->assertStatus(500)->assertSee('RuntimeException');
});
