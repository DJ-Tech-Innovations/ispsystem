<?php

namespace App\Domain\Notifications\Channels;

use App\Mail\TemplatedMail;
use App\Models\NotificationLog;
use Illuminate\Support\Facades\Mail;

class EmailChannel implements NotificationChannel
{
    public function deliver(NotificationLog $log): void
    {
        Mail::to($log->recipient)->send(new TemplatedMail($log->subject ?? '', $log->body));
    }
}
