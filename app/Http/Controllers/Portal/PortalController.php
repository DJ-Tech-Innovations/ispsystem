<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

abstract class PortalController extends Controller
{
    /** Set by EnsureActiveSubscriber from the session user, never from request input. */
    protected function customer(Request $request): Customer
    {
        return $request->attributes->get('customer');
    }

    /** A malformed id is a 404, not a Postgres type error. */
    protected function uuid(string $id): string
    {
        abort_unless(Str::isUuid($id), 404);

        return $id;
    }
}
