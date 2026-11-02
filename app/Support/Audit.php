<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/** Append-only audit trail of who did what. */
final class Audit
{
    public static function log(string $module, string $event, string $description, ?Model $subject = null, array $properties = []): void
    {
        ActivityLog::query()->create([
            'user_id' => Auth::id(),
            'module' => $module,
            'event' => $event,
            'description' => $description,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'properties' => $properties ?: null,
            'ip_address' => App::runningInConsole() ? null : Request::ip(),
            'created_at' => now(),
        ]);
    }
}
