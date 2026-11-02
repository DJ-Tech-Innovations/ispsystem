<?php

namespace App\Models;

use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServicePlan extends Model
{
    use HasFactory, HasUuids, LogsChanges, SoftDeletes;

    protected $guarded = [];

    protected $casts = ['monthly_price' => 'decimal:2', 'installation_fee' => 'decimal:2', 'installation_fee_recurring' => 'boolean', 'is_active' => 'boolean', 'is_public' => 'boolean'];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
