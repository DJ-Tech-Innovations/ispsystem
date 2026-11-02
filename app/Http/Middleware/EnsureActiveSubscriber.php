<?php

namespace App\Http\Middleware;

use App\Support\SignOut;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for the customer portal. It puts the signed-in user's customer on the request, and every portal query starts
 * from that record, so a customer id from the browser is never trusted.
 */
class EnsureActiveSubscriber
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $customer = $user->customer;

        if ($user->isStaff() || ! $user->is_active || ! $customer) {
            SignOut::guard($request, 'customer');

            return redirect()->route('portal.login');
        }

        $request->attributes->set('customer', $customer);

        return $next($request);
    }
}
