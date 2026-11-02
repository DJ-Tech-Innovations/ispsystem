<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/** Issues unique, human-readable numbers such as INV-2026-000123. The atomic upsert makes it safe under concurrency. */
final class ReferenceNumber
{
    public static function next(string $prefix, bool $yearly = true, int $padding = 6): string
    {
        $key = $yearly ? $prefix.'-'.now()->format('Y') : $prefix;

        $value = DB::selectOne(
            'INSERT INTO sequences (key, value, created_at, updated_at) VALUES (?, 1, now(), now())
             ON CONFLICT (key) DO UPDATE SET value = sequences.value + 1, updated_at = now() RETURNING value',
            [$key],
        )->value;

        return $key.'-'.str_pad((string) $value, $padding, '0', STR_PAD_LEFT);
    }
}
