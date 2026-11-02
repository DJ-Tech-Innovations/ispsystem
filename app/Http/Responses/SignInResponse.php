<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse;

class SignInResponse implements LoginResponse
{
    public function toResponse($request)
    {
        // Both areas share a session, so a remembered page might belong to the portal. Staff only follow admin links.
        $intended = (string) $request->session()->pull('url.intended');

        return redirect(str_starts_with((string) parse_url($intended, PHP_URL_PATH), '/admin') ? $intended : '/admin');
    }
}
