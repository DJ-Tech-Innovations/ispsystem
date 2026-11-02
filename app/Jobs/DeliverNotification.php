<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class DeliverNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public string $logId) {}

    public function handle(): void
    {
        $log = NotificationLog::query()->find($this->logId);
        if (! $log || $log->status === 'sent') {
            return;
        }

        $log->increment('attempts');
        $channel = config("isp.notification_channels.{$log->channel}");
        app($channel)->deliver($log);
        $log->update(['status' => 'sent', 'sent_at' => now(), 'error' => null]);
    }

    public function failed(Throwable $exception): void
    {
        NotificationLog::query()->whereKey($this->logId)->update(['status' => 'failed', 'error' => mb_substr($exception->getMessage(), 0, 1000)]);
    }
}
