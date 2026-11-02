<?php

namespace App\Http\Requests;

use App\Enums\TicketCategory;
use App\Enums\TicketPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => [$this->isMethod('post') ? 'required' : 'exclude', 'uuid', 'exists:customers,id'],
            'subscription_id' => ['nullable', 'uuid', 'exists:subscriptions,id'],
            'category' => ['required', Rule::enum(TicketCategory::class)],
            'subject' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:10000'],
            'priority' => ['required', Rule::enum(TicketPriority::class)],
            'assigned_to' => ['nullable', 'uuid', 'exists:users,id'],
        ];
    }
}
