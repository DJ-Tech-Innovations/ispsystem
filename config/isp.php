<?php

use App\Domain\Notifications\Channels\EmailChannel;
use App\Domain\Notifications\Channels\NullSmsChannel;

return [
    // Private disk for ticket files, payment proofs and job photos. Point it at object storage in production.
    'attachments_disk' => env('ATTACHMENTS_DISK', 'local'),

    // Swap an SMS provider in here; nothing else in the billing workflow changes.
    'notification_channels' => [
        'email' => EmailChannel::class,
        'sms' => NullSmsChannel::class,
    ],
];
