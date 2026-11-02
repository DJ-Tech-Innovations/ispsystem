<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class CsvExport
{
    /**
     * @param  list<string>  $headers
     * @param  callable(mixed): list<mixed>  $row
     */
    public static function download(string $name, array $headers, Builder $query, callable $row): StreamedResponse
    {
        Audit::log('export', 'exported', "Exported {$name} to CSV");

        return response()->streamDownload(function () use ($headers, $query, $row) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // so Excel reads ₱ and ñ correctly
            fputcsv($out, $headers);
            $query->lazy(500)->each(fn ($record) => fputcsv($out, array_map(self::safe(...), $row($record))));
            fclose($out);
        }, $name.'-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Stops spreadsheets running a cell as a formula, while phone numbers like +63917... stay as they are. */
    private static function safe(mixed $value): mixed
    {
        if (is_string($value) && preg_match('/^[=+\-@\t\r]/', $value) && ! preg_match('/^[+-]?[\d\s.,()-]+$/', $value)) {
            return "'".$value;
        }

        return $value;
    }
}
