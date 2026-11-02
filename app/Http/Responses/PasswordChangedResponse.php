<?php

namespace App\Http\Responses;

use App\Models\User;
use Laravel\Fortify\Contracts\PasswordResetResponse;

/** After a password reset, each person goes to their own sign-in page. */
class PasswordChangedResponse implements PasswordResetResponse
{
    public function __construct(public string $status = '') {}

    public function toResponse($request)
    {
        $staff = User::query()->where('email', strtolower((string) $request->input('email')))->first()?->isStaff() ?? false;

        return redirect($staff ? '/login' : '/portal/login')->with('status', trans($this->status));
    }
}
