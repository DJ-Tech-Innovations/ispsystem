<?php

namespace App\Domain\Customers;

use App\Models\Customer;

class GeoTagging
{
    public function set(Customer $customer, array $data): void
    {
        $customer->update([
            'latitude' => round((float) $data['latitude'], 7), 'longitude' => round((float) $data['longitude'], 7),
            'geo_source' => $data['source'], 'geo_accuracy' => isset($data['accuracy']) ? (int) round($data['accuracy']) : null,
            'geo_stale' => false, 'geo_tagged_at' => now(), 'geo_tagged_by' => auth()->id(),
        ]);
    }

    public function clear(Customer $customer): void
    {
        $customer->update(['latitude' => null, 'longitude' => null, 'geo_source' => null, 'geo_accuracy' => null, 'geo_stale' => false, 'geo_tagged_at' => null, 'geo_tagged_by' => null]);
    }
}
