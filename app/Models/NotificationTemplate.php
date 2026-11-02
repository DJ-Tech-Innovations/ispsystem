<?php

namespace App\Models;

use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    use HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = ['is_enabled' => 'boolean'];

    public function auditLabel(): string
    {
        return 'Template '.$this->event;
    }
}
