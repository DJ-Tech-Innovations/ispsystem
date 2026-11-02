<?php

namespace App\Models;

use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    use HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = ['is_published' => 'boolean', 'starts_at' => 'datetime', 'ends_at' => 'datetime'];

    public function auditLabel(): string
    {
        return 'Announcement "'.$this->title.'"';
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
