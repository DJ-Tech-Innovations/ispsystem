<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GeoTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route permission middleware decides
    }

    /** The bounds are the Philippines, which also catches latitude and longitude typed the wrong way round. */
    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:4,22'],
            'longitude' => ['required', 'numeric', 'between:116,127'],
            'source' => ['required', Rule::in(['map', 'gps', 'coordinates'])],
            'accuracy' => ['nullable', 'numeric', 'min:0', 'max:100000'],
        ];
    }

    public function messages(): array
    {
        return ['latitude.between' => 'That location is outside the Philippines.', 'longitude.between' => 'That location is outside the Philippines.'];
    }
}
