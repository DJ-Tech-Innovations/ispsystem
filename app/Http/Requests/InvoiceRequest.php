<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InvoiceRequest extends FormRequest
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
            'period_start' => ['nullable', 'date', 'required_with:period_end'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'adjustment' => ['nullable', 'decimal:0,2', 'between:-9999999,9999999'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'decimal:0,2', 'gt:0', 'max:9999'],
            'items.*.unit_price' => ['required', 'decimal:0,2', 'between:-9999999,9999999'],
        ];
    }

    public function attributes(): array
    {
        return ['items.*.description' => 'description', 'items.*.quantity' => 'quantity', 'items.*.unit_price' => 'unit price'];
    }
}
