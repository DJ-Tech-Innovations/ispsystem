<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\HandleMessengerEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class MessengerWebhookController extends Controller
{
    /** Meta's one-time check when the webhook is connected. */
    public function verify(Request $request): Response
    {
        $token = (string) config('services.messenger.verify_token');
        abort_unless($token !== '' && $request->query('hub_mode') === 'subscribe' && hash_equals($token, (string) $request->query('hub_verify_token')), 403);

        return response((string) $request->query('hub_challenge'), 200, ['Content-Type' => 'text/plain']);
    }

    /** Must answer fast or Meta retries, so the work goes on the queue. Unsigned requests are refused outright. */
    public function receive(Request $request): Response
    {
        $secret = (string) config('services.messenger.app_secret');
        $signature = (string) $request->header('X-Hub-Signature-256');
        abort_unless($secret !== '' && hash_equals('sha256='.hash_hmac('sha256', $request->getContent(), $secret), $signature), 403);

        if ($request->input('object') === 'page') {
            foreach ($request->input('entry', []) as $entry) {
                foreach ($entry['messaging'] ?? [] as $event) {
                    $id = $event['message']['mid'] ?? null;
                    // Meta can deliver the same message twice.
                    if ($id === null || Cache::add("messenger-mid:$id", true, now()->addDay())) {
                        HandleMessengerEvent::dispatch($event);
                    }
                }
            }
        }

        return response('EVENT_RECEIVED');
    }
}
