<?php

namespace App\Enums;

enum TicketStatus: string
{
    use Labelled;

    case Open = 'open';
    case InProgress = 'in_progress';
    case WaitingForCustomer = 'waiting_for_customer';
    case Resolved = 'resolved';
    case Closed = 'closed';

    /** @return list<self> */
    public static function active(): array
    {
        return [self::Open, self::InProgress, self::WaitingForCustomer];
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Open => [self::InProgress, self::WaitingForCustomer, self::Resolved, self::Closed],
            self::InProgress => [self::Open, self::WaitingForCustomer, self::Resolved, self::Closed],
            self::WaitingForCustomer => [self::Open, self::InProgress, self::Resolved, self::Closed],
            self::Resolved => [self::Closed],
            self::Closed => [],
        }, true);
    }
}
