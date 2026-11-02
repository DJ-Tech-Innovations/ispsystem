<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillingRun extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = ['run_date' => 'date:Y-m-d', 'failures' => 'array', 'total_amount' => 'decimal:2', 'finished_at' => 'datetime'];

    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
