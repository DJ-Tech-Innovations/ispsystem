<?php

namespace App\Http\Middleware;

use App\Support\SignOut;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Deactivating an account takes effect on the very next request; subscriber logins never reach the admin app. */
class EnsureActiveStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user?->is_active || ! $user->isStaff()) {
            SignOut::guard($request, 'web');

            return redirect()->route('login');
        }

        return $next($request);
    }
}
