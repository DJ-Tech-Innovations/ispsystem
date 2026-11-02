<?php

namespace App\Enums;

enum LeadStatus: string
{
    use Labelled;

    case New = 'new';
    case Contacted = 'contacted';
    case Qualified = 'qualified';
    case Converted = 'converted';
    case Lost = 'lost';
}
