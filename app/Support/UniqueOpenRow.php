<?php

namespace App\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * "Only one row like this may be open": a unique rule that ignores closed rows. PostgreSQL has partial indexes.
 * MySQL doesn't, so there a generated column is 1 for open rows and NULL otherwise, and NULLs never collide.
 * Either way the database enforces it, which is what holds up when two requests race.
 */
final class UniqueOpenRow
{
    /** @param list<string> $columns */
    public static function add(string $table, string $name, array $columns, string $openCondition): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("CREATE UNIQUE INDEX $name ON $table (".implode(', ', $columns).") WHERE $openCondition");

            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($name, $columns, $openCondition) {
            $blueprint->unsignedTinyInteger('open_marker')->nullable()->storedAs("CASE WHEN $openCondition THEN 1 END");
            $blueprint->unique([...$columns, 'open_marker'], $name);
        });
    }
}
