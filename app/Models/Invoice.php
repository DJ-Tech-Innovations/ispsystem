<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Models\Concerns\LogsChanges;
use App\Support\Money;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory, HasUuids, LogsChanges;

    protected $guarded = [];

    protected $casts = [
        'status' => InvoiceStatus::class,
        'period_start' => 'date:Y-m-d', 'period_end' => 'date:Y-m-d', 'issue_date' => 'date:Y-m-d', 'due_date' => 'date:Y-m-d',
        'subtotal' => 'decimal:2', 'adjustment' => 'decimal:2', 'tax' => 'decimal:2', 'total' => 'decimal:2',
        'amount_paid' => 'decimal:2', 'balance' => 'decimal:2', 'voided_at' => 'datetime',
    ];

    protected function auditIgnored(): array
    {
        return ['amount_paid', 'balance'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function isCollectible(): bool
    {
        return in_array($this->status, InvoiceStatus::collectible(), true);
    }

    /** Balance is always derived from confirmed allocations, never edited directly. */
    public function recalculate(): self
    {
        if (in_array($this->status, [InvoiceStatus::Void, InvoiceStatus::Draft], true)) {
            return $this;
        }

        $paid = Money::add((string) $this->allocations()
            ->whereHas('payment', fn ($query) => $query->where('status', 'confirmed'))
            ->sum('amount'));
        $balance = Money::sub($this->total, $paid);

        $this->amount_paid = $paid;
        $this->balance = $balance;
        $this->status = match (true) {
            Money::cmp($balance, 0) <= 0 => InvoiceStatus::Paid,
            $this->due_date->lt(today()) => InvoiceStatus::Overdue,
            Money::cmp($paid, 0) > 0 => InvoiceStatus::PartiallyPaid,
            default => InvoiceStatus::Unpaid,
        };
        $this->save();

        return $this;
    }
}
