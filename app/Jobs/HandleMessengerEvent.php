<?php

namespace App\Jobs;

use App\Domain\Messenger\MessengerBot;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class HandleMessengerEvent implements ShouldQueue
{
    use Queueable;

    /** Not retried: the conversation has moved on by then, and a retry would treat the same message as the next answer. */
    public int $tries = 1;

    public function __construct(public array $event) {}

    public function handle(MessengerBot $bot): void
    {
        $bot->handle($this->event);
    }
}
