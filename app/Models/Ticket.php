<?php

namespace App\Models;

use App\Enums\TicketCategory;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = [
        'category' => TicketCategory::class, 'priority' => TicketPriority::class, 'status' => TicketStatus::class,
        'due_at' => 'datetime', 'first_response_at' => 'datetime', 'resolved_at' => 'datetime', 'closed_at' => 'datetime',
    ];

    protected function auditIgnored(): array
    {
        return ['first_response_at'];
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->can('tickets.view_all') ? $query : $query->where('assigned_to', $user->id);
    }

    public function isVisibleTo(User $user): bool
    {
        return $user->can('tickets.view_all') || $this->assigned_to === $user->id;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', array_map(fn ($status) => $status->value, TicketStatus::active()));
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)->oldest();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(TicketHistory::class)->latest('created_at');
    }

    public function isClosedOut(): bool
    {
        return in_array($this->status, [TicketStatus::Resolved, TicketStatus::Closed], true);
    }

    public function recordHistory(string $event, ?string $old = null, ?string $new = null, ?string $userId = null): void
    {
        $this->histories()->create(['event' => $event, 'old_value' => $old, 'new_value' => $new, 'user_id' => $userId ?? auth()->id(), 'created_at' => now()]);
    }
}
