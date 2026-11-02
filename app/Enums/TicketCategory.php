<?php

namespace App\Enums;

enum TicketCategory: string
{
    use Labelled;

    case NoInternet = 'no_internet';
    case SlowInternet = 'slow_internet';
    case Intermittent = 'intermittent';
    case Billing = 'billing';
    case Installation = 'installation';
    case PlanChange = 'plan_change';
    case Account = 'account';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::NoInternet => 'No Internet Connection',
            self::SlowInternet => 'Slow Internet',
            self::Intermittent => 'Intermittent Connection',
            self::Billing => 'Billing Concern',
            self::Installation => 'Installation Concern',
            self::PlanChange => 'Plan Upgrade / Downgrade',
            self::Account => 'Account Concern',
            self::Other => 'Other',
        };
    }
}
