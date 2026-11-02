<?php

namespace App\Enums;

enum LeadSource: string
{
    use Labelled;

    case Website = 'website';
    case WalkIn = 'walk_in';
    case Referral = 'referral';
    case Facebook = 'facebook';
    case Phone = 'phone';
    case Other = 'other';
}
