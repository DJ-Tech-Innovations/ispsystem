<?php

namespace App\Enums;

enum TicketPriority: string
{
    use Labelled;

    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Urgent = 'urgent';

    /** Default response target, in hours, when Settings doesn't override it. */
    public function defaultSlaHours(): int
    {
        return match ($this) {
            self::Low => 72,
            self::Normal => 48,
            self::High => 24,
            self::Urgent => 8,
        };
    }
}
