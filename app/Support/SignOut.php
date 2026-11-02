<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Ends one area's sign-in. The session itself only goes once nobody is left in it. */
final class SignOut
{
    public const GUARDS = ['web', 'customer'];

    public static function guard(Request $request, string $guard): void
    {
        Auth::guard($guard)->logout();

        foreach (self::GUARDS as $other) {
            if (Auth::guard($other)->check()) {
                return; // keeping the token too, so the other area's open tab can still submit forms
            }
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
