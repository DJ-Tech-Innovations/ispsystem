<?php

namespace App\Http\Requests;

use App\Enums\CustomerType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route permission middleware decides
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(CustomerType::class)],
            'first_name' => ['required_if:type,residential', 'nullable', 'string', 'max:100'],
            'last_name' => ['required_if:type,residential', 'nullable', 'string', 'max:100'],
            'organization_name' => ['required_if:type,business', 'nullable', 'string', 'max:200'],
            'email' => ['nullable', 'email', 'max:255'],
            'mobile' => ['required', 'string', 'max:30', 'regex:/^[0-9+()\s-]{7,30}$/'],
            'alternate_contact' => ['nullable', 'string', 'max:30'],
            'billing_address' => ['required', 'string', 'max:255'],
            'service_address' => ['required', 'string', 'max:255'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'account_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
