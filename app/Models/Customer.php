<?php

namespace App\Models;

use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, HasUuids, LogsChanges, SoftDeletes;

    protected $guarded = [];

    protected $appends = ['name'];

    protected $casts = ['status' => CustomerStatus::class, 'type' => CustomerType::class, 'registered_on' => 'date:Y-m-d', 'latitude' => 'float', 'longitude' => 'float', 'geo_stale' => 'boolean', 'geo_tagged_at' => 'datetime'];

    protected function name(): Attribute
    {
        return Attribute::get(fn () => $this->organization_name ?: trim($this->first_name.' '.$this->last_name));
    }

    public function auditLabel(): string
    {
        return 'Customer '.$this->reference;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function geoTagger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'geo_tagged_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function installationJobs(): HasMany
    {
        return $this->hasMany(InstallationJob::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(CustomerStatusHistory::class)->latest('created_at');
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(CustomerInteraction::class)->latest();
    }

    public function notificationPreference(): HasOne
    {
        return $this->hasOne(NotificationPreference::class);
    }

    public function wantsChannel(string $channel): bool
    {
        $preference = $this->notificationPreference;

        return $channel === 'sms' ? (bool) $preference?->sms_enabled : ($preference?->email_enabled ?? true);
    }
}
