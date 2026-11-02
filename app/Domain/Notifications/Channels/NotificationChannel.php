<?php

namespace App\Domain\Notifications\Channels;

use App\Models\NotificationLog;

interface NotificationChannel
{
    /** Delivers the message or throws. A throw lets the queue retry it. */
    public function deliver(NotificationLog $log): void;
}
