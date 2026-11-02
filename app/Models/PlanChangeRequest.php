<?php

namespace App\Models;

use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanChangeRequest extends Model
{
    use HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = ['current_amount' => 'decimal:2', 'requested_amount' => 'decimal:2', 'decided_at' => 'datetime'];

    public function auditModule(): string
    {
        return 'plan_change';
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function fromPlan(): BelongsTo
    {
        return $this->belongsTo(ServicePlan::class, 'from_plan_id')->withTrashed();
    }

    public function toPlan(): BelongsTo
    {
        return $this->belongsTo(ServicePlan::class, 'to_plan_id')->withTrashed();
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
