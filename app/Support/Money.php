<?php

namespace App\Support;

/** Decimal money arithmetic. Amounts are strings at every step so no float rounding touches a balance. */
final class Money
{
    public static function add(string|int|float|null ...$values): string
    {
        return array_reduce($values, fn (string $sum, $value) => bcadd($sum, (string) ($value ?? 0), 2), '0.00');
    }

    public static function sub(string|int|float|null $a, string|int|float|null $b): string
    {
        return bcsub((string) ($a ?? 0), (string) ($b ?? 0), 2);
    }

    public static function mul(string|int|float|null $a, string|int|float|null $b): string
    {
        // Half-up rounding to centavos.
        $raw = bcmul((string) ($a ?? 0), (string) ($b ?? 0), 6);

        return bcadd($raw, bccomp($raw, '0', 6) < 0 ? '-0.005' : '0.005', 2);
    }

    public static function cmp(string|int|float|null $a, string|int|float|null $b): int
    {
        return bccomp((string) ($a ?? 0), (string) ($b ?? 0), 2);
    }

    public static function format(string|int|float|null $amount): string
    {
        return '₱'.number_format((float) $amount, 2);
    }
}
