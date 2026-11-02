<?php

namespace App\Enums;

enum InstallationStatus: string
{
    use Labelled;

    case Pending = 'pending';
    case Scheduled = 'scheduled';
    case Assigned = 'assigned';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Rescheduled = 'rescheduled';
    case OnHold = 'on_hold';
    case Cancelled = 'cancelled';

    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Cancelled], true);
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Pending => [self::Scheduled, self::Assigned, self::OnHold, self::Cancelled],
            self::Scheduled => [self::Assigned, self::Rescheduled, self::OnHold, self::Cancelled],
            self::Assigned => [self::InProgress, self::Rescheduled, self::OnHold, self::Cancelled],
            self::InProgress => [self::Completed, self::Rescheduled, self::OnHold, self::Cancelled],
            self::Rescheduled => [self::Scheduled, self::Assigned, self::OnHold, self::Cancelled],
            self::OnHold => [self::Pending, self::Scheduled, self::Assigned, self::Cancelled],
            self::Completed, self::Cancelled => [],
        }, true);
    }
}
