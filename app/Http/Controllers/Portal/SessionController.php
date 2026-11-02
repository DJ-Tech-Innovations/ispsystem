<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use App\Support\SignOut;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Customer sign-in. It has its own guard, so it never touches a staff session in the same browser. */
class SessionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::query()->where('email', Str::lower($data['email']))->first();

        if (! $user || $user->isStaff() || ! Hash::check($data['password'], $user->password) || ! $user->is_active) {
            Audit::log('auth', 'failed_login', 'Failed portal sign-in for '.Str::limit($data['email'], 100));

            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        Auth::guard('customer')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect('/portal');
    }

    public function destroy(Request $request): RedirectResponse
    {
        SignOut::guard($request, 'customer');

        return redirect('/portal/login');
    }
}
