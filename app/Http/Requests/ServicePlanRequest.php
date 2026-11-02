<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServicePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:30', 'alpha_dash', Rule::unique('service_plans', 'code')->ignore($this->route('plan'))],
            'description' => ['nullable', 'string', 'max:2000'],
            'speed_description' => ['required', 'string', 'max:120'],
            'monthly_price' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'installation_fee' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'installation_fee_recurring' => ['boolean'],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
            'sort_order' => ['integer', 'min:0', 'max:9999'],
        ];
    }
}
