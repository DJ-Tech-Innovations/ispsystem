<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => [$this->isMethod('post') ? 'required' : 'exclude', 'uuid', 'exists:customers,id'],
            'service_plan_id' => ['required', 'uuid', 'exists:service_plans,id'],
            'service_address' => ['required', 'string', 'max:255'],
            'billing_start_date' => ['nullable', 'date'],
            'billing_day' => ['nullable', 'integer', 'between:1,31'],
            'monthly_amount' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'installation_fee' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'deposit' => ['nullable', 'decimal:0,2', 'min:0', 'max:9999999'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'change_reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
