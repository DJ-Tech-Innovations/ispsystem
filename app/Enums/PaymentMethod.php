<?php

namespace App\Enums;

enum PaymentMethod: string
{
    use Labelled;

    case Cash = 'cash';
    case BankTransfer = 'bank_transfer';
    case Gcash = 'gcash';
    case Maya = 'maya';
    case Check = 'check';
    case Other = 'other';
}
