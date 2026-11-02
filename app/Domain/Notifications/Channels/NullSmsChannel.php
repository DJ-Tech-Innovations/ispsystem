<?php

namespace App\Domain\Notifications\Channels;

use App\Models\NotificationLog;
use RuntimeException;

/** Stand-in until the ISP picks an SMS provider: bind a real adapter to the `sms` channel in config/isp.php. */
class NullSmsChannel implements NotificationChannel
{
    public function deliver(NotificationLog $log): void
    {
        throw new RuntimeException('No SMS provider is configured.');
    }
}
