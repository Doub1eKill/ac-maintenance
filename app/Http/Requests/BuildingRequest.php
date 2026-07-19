<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BuildingRequest extends FormRequest
{
    /**
     * Authorization is done by the controller via BuildingPolicy (needs the
     * loaded model on update, which isn't available here on create) — this
     * request only owns validation.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $universityId = $this->user()->university_id;

        return [
            'name' => [
                'required', 'string', 'max:255',
                // Unique within the admin's own university only — matches
                // the (university_id, name) unique index on buildings.
                Rule::unique('buildings')
                    ->where('university_id', $universityId)
                    ->ignore($this->route('building')),
            ],
            'abbreviation' => [
                'required', 'string', 'max:10', 'alpha_num',
                // Feeds ac_code's second segment (e.g. "B1") — only needs
                // to be unique per university, matching the
                // (university_id, abbreviation) unique index.
                Rule::unique('buildings')
                    ->where('university_id', $universityId)
                    ->ignore($this->route('building')),
            ],
        ];
    }
}
