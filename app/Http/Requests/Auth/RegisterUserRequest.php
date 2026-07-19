<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class RegisterUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // public registration endpoint, no prior auth to check
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            // Self-registration is only for technicians; org_admin/super_admin
            // accounts are provisioned directly by an admin, never through
            // this public form. A technician must belong to exactly one
            // university, so it's required here (not nullable like super_admin).
            'university_id' => ['required', 'integer', 'exists:universities,id'],
        ];
    }
}
