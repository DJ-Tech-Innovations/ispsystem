<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/** Issues unique, human-readable numbers such as INV-2026-000123. A row lock makes it safe under concurrency. */
final class ReferenceNumber
{
    public static function next(string $prefix, bool $yearly = true, int $padding = 6): string
    {
        $key = $yearly ? $prefix.'-'.now()->format('Y') : $prefix;

        // The row lock queues concurrent callers, and a rolled-back invoice gives its number back.
        $value = DB::transaction(function () use ($key) {
            DB::table('sequences')->insertOrIgnore(['key' => $key, 'value' => 0, 'created_at' => now(), 'updated_at' => now()]);
            $next = DB::table('sequences')->where('key', $key)->lockForUpdate()->value('value') + 1;
            DB::table('sequences')->where('key', $key)->update(['value' => $next, 'updated_at' => now()]);

            return $next;
        });

        return $key.'-'.str_pad((string) $value, $padding, '0', STR_PAD_LEFT);
    }
}
