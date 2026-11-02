<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MessengerConversation extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = ['data' => 'array', 'paused_until' => 'datetime'];

    public function isPaused(): bool
    {
        return $this->paused_until?->isFuture() ?? false;
    }

    public function reset(): void
    {
        $this->fill(['state' => 'idle', 'data' => null, 'misses' => 0])->save();
    }
}
