<?php

namespace Database\Seeders;

use App\Models\ServicePlan;
use App\Support\Settings;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * G.CONN IT Solutions, from the client's poster. Safe to run again. Earlier plans are retired, not deleted, because
 * subscriptions and invoices still point to them, and subscribers keep the price they agreed.
 */
class GconnBrandSeeder extends Seeder
{
    private const PLANS = [[799, 50, 'Everyday fiber internet for your home.'], [999, 100, 'More speed for busy homes.'], [1499, 200, 'Plenty of speed for home and office.'], [1999, 300, 'Our fastest plan, for home and office.']];

    public function run(): void
    {
        foreach (['logo', 'mark'] as $file) {
            Storage::disk('public')->put("branding/gconn-$file.png", file_get_contents(resource_path("brand/gconn-$file.png")));
        }

        $codes = [];
        foreach (self::PLANS as $order => [$price, $mbps, $description]) {
            $codes[] = $code = "PLAN-$price";
            ServicePlan::query()->updateOrCreate(['code' => $code], [
                'name' => "Plan $price", 'description' => $description, 'speed_description' => "$mbps Mbps Unlimited",
                'monthly_price' => $price, 'installation_fee' => 500, 'is_active' => true, 'is_public' => true, 'sort_order' => $order,
            ]);
        }
        ServicePlan::query()->whereNotIn('code', $codes)->get()->each(fn (ServicePlan $plan) => $plan->update(['is_active' => false, 'is_public' => false]));

        Settings::put([
            'business.name' => 'G.CONN IT Solutions',
            'business.tagline' => 'Fast. Reliable. Unlimited.',
            'business.logo' => 'branding/gconn-logo.png',
            'business.logo_mark' => 'branding/gconn-mark.png',
            'business.phone' => '0966-132-2192',
            'business.phone_2' => '0968-677-2915',
            'business.address' => '',
            'website.hours' => '',
            'website.hero_title' => 'Connect to what matters most',
            'website.hero_subtitle' => 'G.CONN Fiber plans are fast, reliable and unlimited. Perfect for home and office, with local support.',
            'website.about_title' => 'Fiber internet with local support',
            'website.about_body' => "G.CONN IT Solutions brings fast, reliable and unlimited fiber internet to homes and offices around Poblacion.\n\nWhen you need help, you talk to a local team.",
            'website.benefits' => [
                ['title' => 'Super fast speed', 'body' => 'Lightning-fast internet for everything you do.'],
                ['title' => 'Stable connection', 'body' => 'Consistent speed, anytime, anywhere.'],
                ['title' => 'Unlimited data', 'body' => 'No data caps. No limits.'],
                ['title' => 'Local support', 'body' => 'Fiber-fast internet for home and office, with help close by.'],
            ],
            'website.coverage_intro' => 'We are serving around Poblacion, where installation is only ₱500. Outside the area? Send an inquiry and we will check for you.',
            'website.coverage_areas' => ['Brgy. Poblacion'],
            'website.slides' => [
                ['title' => 'Installation only ₱500 around Poblacion', 'body' => 'Get connected to fast, reliable, unlimited fiber.', 'cta_label' => 'Inquire Now', 'cta_url' => '/contact', 'image' => null],
                ['title' => 'Special plans also available', 'body' => 'Tell us what your home or office needs.', 'cta_label' => 'Ask About Special Plans', 'cta_url' => '/contact', 'image' => null],
                ['title' => 'Your account, right on your phone', 'body' => 'Check your balance, download receipts and report a problem from the customer portal.', 'cta_label' => 'Customer Login', 'cta_url' => '/portal/login', 'image' => null],
            ],
            'website.faqs' => [
                ['question' => 'How much is installation?', 'answer' => 'Installation is only ₱500 around Poblacion.'],
                ['question' => 'Is the data really unlimited?', 'answer' => 'Yes. Our fiber plans have no data caps.'],
                ['question' => 'Do you have other plans?', 'answer' => 'Special plans are also available. Send an inquiry or call us.'],
                ['question' => 'How do I sign up?', 'answer' => 'Send an inquiry from our Contact page or call us. We will confirm coverage, then schedule your installation.'],
                ['question' => 'What if my internet goes down?', 'answer' => 'Report it on our Support page, in the customer portal, or call us.'],
            ],
        ]);
    }
}
