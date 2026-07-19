<?php

namespace App\Http\Requests;

use App\Models\AirConditioner;
use App\Models\WorkOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceLogRequest extends FormRequest
{
    /**
     * Route-level middleware already restricts this to role:technician;
     * this only owns validation, including the tenant check on
     * air_conditioner_id below.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $universityId = $this->user()->university_id;

        return [
            'air_conditioner_id' => [
                'required',
                'integer',
                Rule::exists('air_conditioners', 'id'),
                // A technician could otherwise submit a crafted
                // air_conditioner_id for a unit at a different university —
                // this closure is the same tenant-ownership pattern used in
                // AirConditionerRequest's room_id check.
                function (string $attribute, mixed $value, \Closure $fail) use ($universityId) {
                    $belongsToTenant = AirConditioner::where('id', $value)
                        ->whereHas('room.building', fn ($q) => $q->where('university_id', $universityId))
                        ->exists();

                    if (! $belongsToTenant) {
                        $fail('The selected air conditioner is invalid.');
                    }
                },
            ],
            // Fixed list agreed with the domain — not user-extensible from
            // this form.
            'action' => ['required', Rule::in(['cleaning', 'repair', 'refill_refrigerant'])],
            'notes' => ['nullable', 'string', 'max:2000'],

            // Optional: only present when this log is closing a work order
            // the technician claimed from the pool. Re-validated here (not
            // just trusted from a hidden field) so a technician can't type
            // in someone else's work_order_id and silently mark it
            // completed on their behalf.
            'work_order_id' => [
                'nullable',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $isOwnClaimedOrder = WorkOrder::where('id', $value)
                        ->where('claimed_by', $this->user()->id)
                        ->where('status', 'claimed')
                        ->where('air_conditioner_id', $this->input('air_conditioner_id'))
                        ->exists();

                    if (! $isOwnClaimedOrder) {
                        $fail('The selected work order is invalid.');
                    }
                },
            ],
        ];
    }
}
