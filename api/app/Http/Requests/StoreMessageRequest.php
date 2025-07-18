<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

class StoreMessageRequest extends FormRequest
{
       /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'message' => 'nullable|string|max:10000', // Increased max length for JSON voice data
            'group_id' => 'required_without:receiver_id|nullable|exists:groups,id',
            'receiver_id' =>  'required_without:group_id|nullable|exists:users,id',
            'reply_to_id' => 'nullable|exists:messages,id',
            'attachments' => 'nullable|array|max:10',
            'attachments.*' => 'file|max:1024000',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        Log::error('Validation failed for message store:', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->all(),
            'files' => $this->allFiles(),
        ]);
        
        parent::failedValidation($validator);
    }
}
