<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    use Labelled;

    case Draft = 'draft';
    case Unpaid = 'unpaid';
    case PartiallyPaid = 'partially_paid';
    case Paid = 'paid';
    case Overdue = 'overdue';
    case Void = 'void';

    /** @return list<self> */
    public static function collectible(): array
    {
        return [self::Unpaid, self::PartiallyPaid, self::Overdue];
    }
}
