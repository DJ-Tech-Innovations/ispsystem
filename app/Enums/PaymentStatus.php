<?php

namespace App\Enums;

enum PaymentStatus: string
{
    use Labelled;

    case Confirmed = 'confirmed';
    case Reversed = 'reversed';
}
