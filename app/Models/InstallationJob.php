<?php

namespace App\Models;

use App\Enums\InstallationStatus;
use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstallationJob extends Model
{
    use HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = ['status' => InstallationStatus::class, 'preferred_at' => 'datetime', 'completed_at' => 'datetime', 'confirmed_at' => 'datetime'];

    public function auditModule(): string
    {
        return 'installation';
    }

    /** Technicians only see their own jobs unless granted broader access. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->can('installations.view_all') ? $query : $query->where('technician_id', $user->id);
    }

    public function isVisibleTo(User $user): bool
    {
        return $user->can('installations.view_all') || $this->technician_id === $user->id;
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(InstallationUpdate::class)->latest('created_at');
    }
}
