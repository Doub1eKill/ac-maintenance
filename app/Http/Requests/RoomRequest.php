<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoomRequest extends FormRequest
{
    /**
     * Authorization is done by the controller via RoomPolicy — this
     * request only owns validation.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Store routes nest under /buildings/{building}/rooms (building_id
        // comes from the URL). Update/destroy are shallow — /rooms/{room} —
        // so building_id has to come from the existing model instead.
        $buildingId = $this->route('building')?->id
            ?? $this->route('room')?->building_id;

        return [
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('rooms')
                    ->where('building_id', $buildingId)
                    ->ignore($this->route('room')),
            ],
            'floor' => ['nullable', 'integer', 'min:0', 'max:200'],
        ];
    }
}
