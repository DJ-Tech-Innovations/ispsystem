<?php

namespace App\Enums;

enum InteractionType: string
{
    use Labelled;

    case Note = 'note';
    case Call = 'call';
    case Visit = 'visit';
    case Email = 'email';
    case Sms = 'sms';
}
