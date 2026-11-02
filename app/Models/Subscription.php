<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory, HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = [
        'status' => SubscriptionStatus::class,
        'activated_on' => 'date:Y-m-d', 'billing_start_date' => 'date:Y-m-d', 'next_billing_date' => 'date:Y-m-d',
        'monthly_amount' => 'decimal:2', 'installation_fee' => 'decimal:2', 'deposit' => 'decimal:2',
        'installation_fee_billed_at' => 'datetime',
    ];

    protected function auditIgnored(): array
    {
        return ['next_billing_date', 'installation_fee_billed_at'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(ServicePlan::class, 'service_plan_id')->withTrashed();
    }

    public function histories(): HasMany
    {
        return $this->hasMany(SubscriptionHistory::class)->latest('created_at');
    }

    public function installationJobs(): HasMany
    {
        return $this->hasMany(InstallationJob::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function hasConfirmedInstallation(): bool
    {
        return $this->installationJobs()->whereNotNull('confirmed_at')->exists();
    }
}
