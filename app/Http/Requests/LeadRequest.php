<?php

namespace App\Http\Requests;

use App\Enums\LeadSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:255'],
            'mobile' => ['nullable', 'required_without:email', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'source' => ['required', Rule::enum(LeadSource::class)],
            'service_plan_id' => ['nullable', 'uuid', 'exists:service_plans,id'],
            'assigned_to' => ['nullable', 'uuid', 'exists:users,id'],
            'follow_up_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
