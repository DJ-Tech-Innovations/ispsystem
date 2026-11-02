<?php

namespace App\Models;

use App\Enums\InstallationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallationUpdate extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    protected $guarded = [];

    protected $casts = ['old_status' => InstallationStatus::class, 'new_status' => InstallationStatus::class];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
