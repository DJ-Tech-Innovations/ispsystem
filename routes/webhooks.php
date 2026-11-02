<?php

use App\Http\Controllers\Webhooks\MessengerWebhookController;
use Illuminate\Support\Facades\Route;

// Outside the web group: no session or CSRF. Every POST must carry Meta's signature instead.
Route::middleware('throttle:messenger')->group(function () {
    Route::get('webhooks/messenger', [MessengerWebhookController::class, 'verify']);
    Route::post('webhooks/messenger', [MessengerWebhookController::class, 'receive']);
});
