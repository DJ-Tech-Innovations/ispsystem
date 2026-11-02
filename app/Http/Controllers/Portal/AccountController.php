<?php

namespace App\Http\Controllers\Portal;

use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends PortalController
{
    public function edit(Request $request): Response
    {
        $customer = $this->customer($request);
        $preference = $customer->notificationPreference;

        return Inertia::render('portal/account', [
            'profile' => $customer->only(['name', 'reference', 'type', 'email', 'mobile', 'alternate_contact', 'billing_address', 'service_address', 'landmark']),
            'preferences' => ['email_enabled' => $preference?->email_enabled ?? true, 'sms_enabled' => (bool) $preference?->sms_enabled],
        ]);
    }

    /** Phone numbers only. Name, addresses and the login email go through staff so billing records stay accurate. */
    public function update(Request $request): RedirectResponse
    {
        $customer = $this->customer($request);
        $customer->update($request->validate([
            'mobile' => ['required', 'string', 'max:30', 'regex:/^[0-9+()\s-]{7,30}$/'],
            'alternate_contact' => ['nullable', 'string', 'max:30'],
        ]));

        return back()->with('success', 'Contact details saved');
    }

    public function preferences(Request $request): RedirectResponse
    {
        $this->customer($request)->notificationPreference()->updateOrCreate([], $request->validate([
            'email_enabled' => ['required', 'boolean'], 'sms_enabled' => ['required', 'boolean'],
        ]));

        return back()->with('success', 'Preferences saved');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(10)],
        ]);
        $request->user()->update(['password' => $data['password']]);
        Audit::log('user', 'password_changed', 'Customer changed their portal password', $request->user());

        return back()->with('success', 'Password changed');
    }
}
