<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TicketAttachment extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $hidden = ['path'];
}
