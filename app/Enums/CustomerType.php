<?php

namespace App\Enums;

enum CustomerType: string
{
    use Labelled;

    case Residential = 'residential';
    case Business = 'business';
}
