<?php

namespace App\Http\Requests;

use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AirConditionerRequest extends FormRequest
{
    /**
     * Authorization is done by the controller via AirConditionerPolicy —
     * this request only owns validation.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $universityId = $this->user()->university_id;

        return [
            // Only required on create. room_id is intentionally NOT
            // editable afterwards (see update() in the request/controller):
            // ac_code is derived from the room's building/university/name
            // at creation time, so moving a unit to another room later
            // would silently make its ac_code lie about where it is.
            // Re-register instead of reassigning if a unit physically moves.
            'room_id' => [
                $this->isMethod('post') ? 'required' : 'prohibited',
                'integer',
                // Rule::exists can't join tables, so a closure checks the
                // room actually belongs to this admin's own university —
                // without this, an org_admin could register a unit into
                // another tenant's room just by guessing its ID.
                function (string $attribute, mixed $value, \Closure $fail) use ($universityId) {
                    $belongsToTenant = Room::where('id', $value)
                        ->whereHas('building', fn ($q) => $q->where('university_id', $universityId))
                        ->exists();

                    if (! $belongsToTenant) {
                        $fail('The selected room is invalid.');
                    }
                },
            ],
            'brand' => ['required', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'btu' => ['nullable', 'integer', 'min:1000', 'max:200000'],
            'installed_at' => ['nullable', 'date', 'before_or_equal:today'],
            'status' => ['required', Rule::in(['normal', 'broken', 'needs_cleaning'])],
        ];
    }
}
