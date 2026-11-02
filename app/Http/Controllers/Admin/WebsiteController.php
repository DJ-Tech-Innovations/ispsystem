<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Messenger\MessengerClient;
use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class WebsiteController extends Controller
{
    private const KEYS = ['slides', 'hero_title', 'hero_subtitle', 'about_title', 'about_body', 'benefits', 'coverage_intro', 'coverage_areas', 'faqs', 'hours', 'facebook_url', 'messenger_username', 'messenger_bot_enabled', 'messenger_welcome', 'privacy_body'];

    public function index(): Response
    {
        return Inertia::render('website/index', [
            'content' => collect(self::KEYS)->mapWithKeys(fn ($key) => [$key => Settings::get("website.$key")]),
            'storageUrl' => Storage::disk('public')->url(''),
            'messenger' => ['webhook' => url('/webhooks/messenger'), 'configured' => MessengerClient::isConfigured()],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'slides' => ['array', 'max:6'],
            'slides.*.title' => ['required', 'string', 'max:90'],
            'slides.*.body' => ['nullable', 'string', 'max:200'],
            'slides.*.cta_label' => ['nullable', 'required_with:slides.*.cta_url', 'string', 'max:30'],
            // Same-site paths, page anchors or https links only, so a slide can't carry a javascript: link.
            'slides.*.cta_url' => ['nullable', 'required_with:slides.*.cta_label', 'string', 'max:255', 'regex:~^(/(?!/)|#|https://)~'],
            'slides.*.image' => ['nullable', 'string', 'regex:~^slides/[A-Za-z0-9._-]+$~'],
            'hero_title' => ['required', 'string', 'max:120'],
            'hero_subtitle' => ['required', 'string', 'max:300'],
            'about_title' => ['required', 'string', 'max:120'],
            'about_body' => ['required', 'string', 'max:5000'],
            'benefits' => ['array', 'max:8'],
            'benefits.*.title' => ['required', 'string', 'max:80'],
            'benefits.*.body' => ['required', 'string', 'max:300'],
            'coverage_intro' => ['required', 'string', 'max:500'],
            'coverage_areas' => ['array', 'max:200'],
            'coverage_areas.*' => ['required', 'string', 'max:120'],
            'faqs' => ['array', 'max:30'],
            'faqs.*.question' => ['required', 'string', 'max:200'],
            'faqs.*.answer' => ['required', 'string', 'max:1000'],
            'hours' => ['nullable', 'string', 'max:120'],
            'facebook_url' => ['nullable', 'url:https', 'max:255'],
            'messenger_username' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9.\-]+$/'],
            'messenger_bot_enabled' => ['boolean'],
            'messenger_welcome' => ['nullable', 'string', 'max:600'],
            'privacy_body' => ['required', 'string', 'max:20000'],
        ], [], ['slides.*.title' => 'slide title', 'slides.*.cta_label' => 'button text', 'slides.*.cta_url' => 'button link', 'benefits.*.title' => 'title', 'benefits.*.body' => 'description', 'faqs.*.question' => 'question', 'faqs.*.answer' => 'answer', 'coverage_areas.*' => 'area']);

        if (array_key_exists('slides', $data)) {
            $kept = array_filter(array_column($data['slides'], 'image'));
            foreach (array_diff(array_filter(array_column((array) Settings::get('website.slides', []), 'image')), $kept) as $unused) {
                Storage::disk('public')->delete($unused);
            }
        }

        // Only what was sent changes, and a cleared text field is saved as empty.
        Settings::put(collect($data)->only(self::KEYS)->mapWithKeys(fn ($value, $key) => ["website.$key" => $value ?? ''])->all());
        Audit::log('website', 'updated', 'Website content updated');

        return back()->with('success', 'Website updated');
    }

    /** Stores a slide picture and hands back its path. It only goes live once the page is published. */
    public function slideImage(Request $request): JsonResponse
    {
        $file = $request->validate(['image' => ['required', 'file', 'max:4096', 'mimes:jpg,jpeg,png,webp']])['image'];
        $path = $file->store('slides', 'public');

        return response()->json(['path' => $path, 'url' => Storage::disk('public')->url($path)]);
    }
}
