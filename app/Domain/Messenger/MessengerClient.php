<?php

namespace App\Domain\Messenger;

use Illuminate\Support\Facades\Http;

class MessengerClient
{
    public static function isConfigured(): bool
    {
        return filled(config('services.messenger.page_token')) && filled(config('services.messenger.app_secret')) && filled(config('services.messenger.verify_token'));
    }

    /** @param array<string, string> $quickReplies payload => button label */
    public function send(string $psid, string $text, array $quickReplies = []): void
    {
        $message = ['text' => mb_substr($text, 0, 2000), 'metadata' => 'bot'];

        if ($quickReplies !== []) {
            // Meta's limits: 13 buttons, 20 characters each.
            $message['quick_replies'] = collect($quickReplies)->take(13)
                ->map(fn (string $title, string $payload) => ['content_type' => 'text', 'title' => mb_substr($title, 0, 20), 'payload' => $payload])->values()->all();
        }

        $this->post('me/messages', ['recipient' => ['id' => $psid], 'messaging_type' => 'RESPONSE', 'message' => $message]);
    }

    public function post(string $path, array $body): void
    {
        Http::withToken((string) config('services.messenger.page_token'))->retry(2, 500)
            ->post('https://graph.facebook.com/'.config('services.messenger.graph_version')."/$path", $body);
    }
}
