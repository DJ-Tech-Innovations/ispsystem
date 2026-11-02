<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    private const RULES = [
        'business.name' => ['required', 'string', 'max:120'],
        'business.tagline' => ['nullable', 'string', 'max:120'],
        'business.email' => ['required', 'email'],
        'business.phone' => ['nullable', 'string', 'max:50'],
        'business.phone_2' => ['nullable', 'string', 'max:50'],
        'business.address' => ['nullable', 'string', 'max:255'],
        'business.tin' => ['nullable', 'string', 'max:30'],
        'billing.default_day' => ['nullable', 'integer', 'between:1,31'],
        'billing.due_days' => ['required', 'integer', 'between:0,90'],
        'billing.tax_rate' => ['required', 'numeric', 'between:0,100'],
        'billing.tax_label' => ['required', 'string', 'max:20'],
        'billing.bill_suspended' => ['required', 'boolean'],
        'billing.installation_fee_on_first_invoice' => ['required', 'boolean'],
        'billing.due_reminder_days' => ['required', 'integer', 'between:0,30'],
        'billing.overdue_reminder_days' => ['required', 'integer', 'between:0,60'],
        'billing.invoice_footer' => ['nullable', 'string', 'max:1000'],
        'tickets.allow_reopen' => ['required', 'boolean'],
        'tickets.reopen_window_days' => ['required', 'integer', 'between:0,365'],
        'tickets.auto_close_days' => ['required', 'integer', 'between:0,365'],
        'tickets.sla_hours_low' => ['required', 'integer', 'between:1,720'],
        'tickets.sla_hours_normal' => ['required', 'integer', 'between:1,720'],
        'tickets.sla_hours_high' => ['required', 'integer', 'between:1,720'],
        'tickets.sla_hours_urgent' => ['required', 'integer', 'between:1,720'],
        'customers.duplicate_fields' => ['array'],
        'customers.duplicate_fields.*' => ['in:mobile,email,name'],
        'notifications.email_enabled' => ['required', 'boolean'],
        'notifications.sms_enabled' => ['required', 'boolean'],
    ];

    public function index(): Response
    {
        $settings = Settings::all();
        unset($settings['business.logo'], $settings['business.logo_mark']);
        $settings = array_filter($settings, fn (string $key) => ! str_starts_with($key, 'website.'), ARRAY_FILTER_USE_KEY);

        return Inertia::render('settings/index', ['settings' => collect($settings)->mapWithKeys(fn ($v, $k) => [str_replace('.', '__', $k) => $v])]);
    }

    public function update(Request $request): RedirectResponse
    {
        // Dots would nest in validation, so the form posts business__name style keys.
        $input = collect($request->all())->mapWithKeys(fn ($v, $k) => [str_replace('__', '.', $k) => $v])->undot()->all();
        // Only what was sent is validated, so one tab can save without the others.
        $rules = array_map(fn (array $rule) => ['sometimes', ...$rule], self::RULES);
        $validated = validator($input, $rules)->validate();

        $flat = [];
        foreach (array_keys(self::RULES) as $key) {
            if (! str_contains($key, '*') && data_get($input, $key, '__missing') !== '__missing') {
                $flat[$key] = data_get($validated, $key);
            }
        }
        Settings::put($flat);
        Audit::log('settings', 'updated', 'Settings updated', null, ['keys' => array_keys($flat)]);

        return back()->with('success', 'Settings saved');
    }

    public function logo(Request $request): RedirectResponse
    {
        $file = $request->validate(['logo' => ['required', 'file', 'max:2048', 'mimes:jpg,jpeg,png,webp']])['logo'];
        if ($old = Settings::get('business.logo')) {
            Storage::disk('public')->delete($old);
        }
        Settings::put(['business.logo' => $file->store('branding', 'public')]);

        return back()->with('success', 'Logo updated');
    }
}
