<?php

namespace App\Enums;

enum CustomerStatus: string
{
    use Labelled;

    case Inquiry = 'inquiry';
    case Registered = 'registered';
    case ForInstallation = 'for_installation';
    case Active = 'active';
    case Suspended = 'suspended';
    case Terminated = 'terminated';
}
