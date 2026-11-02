<?php

namespace App\Models;

use App\Enums\InteractionType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerInteraction extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = ['type' => InteractionType::class];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
