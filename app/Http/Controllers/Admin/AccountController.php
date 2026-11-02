<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('account/index', ['profile' => $request->user()->only('name', 'email', 'phone')]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->user()->update($request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($request->user())],
            'phone' => ['nullable', 'string', 'max:30'],
        ]));

        return back()->with('success', 'Profile saved');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(10)],
        ]);
        $request->user()->update(['password' => $data['password']]);
        Audit::log('user', 'password_changed', "{$request->user()->name} changed their password", $request->user());

        return back()->with('success', 'Password changed');
    }
}
