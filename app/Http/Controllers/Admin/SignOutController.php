<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\SignOut;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Replaces Fortify's sign-out, which destroys the whole session and would end a customer sign-in too. */
class SignOutController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        SignOut::guard($request, 'web');

        return redirect('/login');
    }
}
