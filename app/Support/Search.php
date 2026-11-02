<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class Search
{
    /** A case-insensitive LIKE. PostgreSQL needs ilike; MySQL's default collation already ignores case. */
    public static function like(): string
    {
        return DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }
}
