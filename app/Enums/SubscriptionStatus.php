<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    use Labelled;

    case Pending = 'pending';
    case ForInstallation = 'for_installation';
    case Active = 'active';
    case Suspended = 'suspended';
    case Cancelled = 'cancelled';
    case Terminated = 'terminated';

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Pending => [self::ForInstallation, self::Active, self::Cancelled],
            self::ForInstallation => [self::Pending, self::Active, self::Cancelled],
            self::Active => [self::Suspended, self::Terminated],
            self::Suspended => [self::Active, self::Terminated],
            self::Cancelled, self::Terminated => [],
        }, true);
    }
}
