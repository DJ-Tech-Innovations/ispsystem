<?php

namespace App\Domain\Subscriptions;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/** Date rules for recurring billing. Days past a short month's end clamp to its last day (31 → Feb 28). */
class BillingCalendar
{
    public function firstBillingDate(CarbonInterface $start, ?int $billingDay): CarbonImmutable
    {
        $start = CarbonImmutable::parse($start)->startOfDay();
        if (! $billingDay) {
            return $start;
        }

        $candidate = $this->onDay($start, $billingDay);

        return $candidate->lt($start) ? $this->onDay($start->startOfMonth()->addMonth(), $billingDay) : $candidate;
    }

    public function nextBillingDate(CarbonInterface $current, int $anchorDay): CarbonImmutable
    {
        return $this->onDay(CarbonImmutable::parse($current)->startOfMonth()->addMonth(), $anchorDay);
    }

    public function periodEnd(CarbonInterface $start, int $anchorDay): CarbonImmutable
    {
        return $this->nextBillingDate($start, $anchorDay)->subDay();
    }

    private function onDay(CarbonImmutable $month, int $day): CarbonImmutable
    {
        return $month->setDay(min($day, $month->daysInMonth));
    }
}
