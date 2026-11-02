<?php

namespace App\Http\Controllers\Site;

use App\Domain\Tickets\GuestTicketIntake;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\TicketCategory;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Lead;
use App\Models\ServicePlan;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Public pages. Everything sent to these pages is listed by hand, so nothing internal can leak onto the website. */
class SiteController extends Controller
{
    public function home(): Response
    {
        return $this->page('public/home', 'Fast, dependable local internet', Settings::get('website.hero_subtitle'), [
            'plans' => $this->publicPlans(),
            'announcements' => $this->announcements(),
            'content' => $this->content('hero_title', 'hero_subtitle', 'benefits', 'coverage_intro', 'coverage_areas'),
            'slides' => collect(Settings::get('website.slides', []))->map(fn (array $slide) => [
                ...collect($slide)->only(['title', 'body', 'cta_label', 'cta_url']),
                'image' => filled($slide['image'] ?? null) ? Storage::disk('public')->url($slide['image']) : null,
            ])->all(),
        ]);
    }

    public function about(): Response
    {
        return $this->page('public/about', 'About us', 'Who we are and how we look after our community.', ['content' => $this->content('about_title', 'about_body', 'benefits')]);
    }

    public function plans(): Response
    {
        return $this->page('public/plans', 'Internet plans', 'Compare our internet plans and monthly prices.', ['plans' => $this->publicPlans()]);
    }

    public function coverage(): Response
    {
        return $this->page('public/coverage', 'Coverage area', 'See the areas we serve.', ['content' => $this->content('coverage_intro', 'coverage_areas')]);
    }

    public function faq(): Response
    {
        return $this->page('public/faq', 'Frequently asked questions', 'Answers about sign-up, installation, billing and support.', ['content' => $this->content('faqs')]);
    }

    public function contact(Request $request): Response
    {
        return $this->page('public/contact', 'Contact us', 'Ask about coverage or send an inquiry.', ['plans' => $this->publicPlans(), 'selectedPlan' => $request->query('plan')]);
    }

    public function privacy(): Response
    {
        return $this->page('public/privacy', 'Privacy notice', 'How we handle your personal information.', ['content' => $this->content('privacy_body')]);
    }

    /** An inquiry only ever becomes a lead. Staff decide whether it becomes a customer. */
    public function inquire(Request $request): RedirectResponse
    {
        // Bots fill every field. Pretending it worked gives them nothing to adapt to.
        if (filled($request->input('website'))) {
            return back()->with('inquiry_sent', true);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'mobile' => ['required', 'string', 'max:30', 'regex:/^[0-9+()\s-]{7,30}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'plan' => ['nullable', 'string', 'exists:service_plans,code'],
            'message' => ['nullable', 'string', 'max:2000'],
            'consent' => ['accepted'],
        ], ['consent.accepted' => 'Please agree so we can contact you.', 'mobile.regex' => 'Enter a valid mobile number.']);

        Lead::query()->create([
            'reference' => ReferenceNumber::next('LD'),
            'name' => $data['name'], 'mobile' => $data['mobile'], 'email' => $data['email'] ?? null, 'address' => $data['address'], 'notes' => $data['message'] ?? null,
            'source' => LeadSource::Website, 'status' => LeadStatus::New,
            'service_plan_id' => filled($data['plan'] ?? null) ? ServicePlan::query()->where('code', $data['plan'])->where('is_public', true)->value('id') : null,
        ]);

        return back()->with('inquiry_sent', true);
    }

    public function support(): Response
    {
        return $this->page('public/support', 'Customer support', 'Report a problem with your internet service.', [
            'categories' => TicketCategory::options(),
            'ticketNumber' => session('ticket_number'),
        ]);
    }

    public function report(Request $request, GuestTicketIntake $intake): RedirectResponse
    {
        if (filled($request->input('website'))) {
            return back()->with('ticket_number', 'received');
        }

        $data = $request->validate([
            'reference' => ['required', 'string', 'max:40'],
            'mobile' => ['required', 'string', 'max:30'],
            'category' => ['required', Rule::enum(TicketCategory::class)],
            'description' => ['required', 'string', 'min:5', 'max:5000'],
        ]);

        $customer = $intake->verify($data['reference'], $data['mobile']);
        if (! $customer) {
            throw ValidationException::withMessages(['reference' => "Those details don't match our records. Check your invoice or call us."]);
        }

        return back()->with('ticket_number', $intake->open($customer, TicketCategory::from($data['category']), $data['description'], 'website')->number);
    }

    private function page(string $component, string $title, ?string $description, array $props): Response
    {
        $name = Settings::get('business.name');

        return Inertia::render($component, [...$props, 'pageTitle' => $title, 'contact' => self::contactDetails(), 'inquirySent' => session('inquiry_sent', false)])
            ->withViewData(['meta' => ['title' => "$title · $name", 'description' => $description]]);
    }

    public static function contactDetails(): array
    {
        return [
            // A placeholder address never appears on the public site.
            'email' => str_ends_with((string) Settings::get('business.email'), '@example.com') ? '' : Settings::get('business.email'),
            'phone' => Settings::get('business.phone'), 'phone2' => Settings::get('business.phone_2'), 'address' => Settings::get('business.address'),
            'hours' => Settings::get('website.hours'), 'facebook' => Settings::get('website.facebook_url'),
            'messenger' => filled($page = Settings::get('website.messenger_username')) ? "https://m.me/$page" : null,
        ];
    }

    private function content(string ...$keys): array
    {
        return collect($keys)->mapWithKeys(fn (string $key) => [$key => Settings::get("website.$key")])->all();
    }

    private function publicPlans(): Collection
    {
        return ServicePlan::query()->where('is_active', true)->where('is_public', true)->orderBy('sort_order')->orderBy('monthly_price')
            ->get(['name', 'code', 'description', 'speed_description', 'monthly_price', 'installation_fee']);
    }

    private function announcements(): Collection
    {
        return Announcement::query()->where('is_published', true)->whereIn('audience', ['all', 'website'])
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->latest()->limit(2)->get(['title', 'body']);
    }
}
