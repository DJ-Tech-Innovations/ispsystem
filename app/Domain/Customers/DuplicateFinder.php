<?php

namespace App\Domain\Customers;

use App\Models\Customer;
use App\Support\Settings;
use Illuminate\Support\Collection;

/** Finds likely duplicates using the fields picked in Settings. Name alone is never treated as a match. */
class DuplicateFinder
{
    /** @return Collection<int, Customer> */
    public function find(array $data, ?string $ignoreId = null): Collection
    {
        $fields = (array) Settings::get('customers.duplicate_fields', ['mobile', 'email']);
        $name = trim(($data['first_name'] ?? '').' '.($data['last_name'] ?? '')) ?: ($data['organization_name'] ?? '');

        return Customer::query()
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->where(function ($query) use ($fields, $data) {
                $matched = false;
                foreach (['mobile', 'email'] as $field) {
                    if (in_array($field, $fields, true) && filled($data[$field] ?? null)) {
                        $query->orWhereRaw("lower($field) = ?", [mb_strtolower(trim($data[$field]))]);
                        $matched = true;
                    }
                }
                $matched || $query->whereRaw('1 = 0');
            })
            ->limit(5)
            ->get()
            ->when(in_array('name', $fields, true), fn (Collection $found) => $found->filter(
                fn (Customer $customer) => strcasecmp($customer->name, $name) === 0,
            ))
            ->values();
    }
}
