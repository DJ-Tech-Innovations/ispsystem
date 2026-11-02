<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;

/** Same message whether or not the email exists, so the public form can't be used to discover customers. */
class NeutralResetLinkResponse implements FailedPasswordResetLinkRequestResponse
{
    public function __construct(public string $status = '') {}

    public function toResponse($request)
    {
        return back()->with('status', 'If that email has an account, a link is on its way.');
    }
}
