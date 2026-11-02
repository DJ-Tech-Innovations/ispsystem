<?php

namespace App\Enums;

use Illuminate\Support\Str;

/** Gives backed enums a human label and the option list the frontend renders in selects. */
trait Labelled
{
    public function label(): string
    {
        return Str::of($this->value)->replace('_', ' ')->title()->toString();
    }

    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(fn (self $case) => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
