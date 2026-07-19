<?php

namespace App\Policies;

use App\Models\AirConditioner;
use App\Models\User;

class AirConditionerPolicy
{
    /**
     * Tenant derives through air_conditioner -> room -> building (same
     * normalization reasoning as RoomPolicy — no university_id duplicated
     * on this table).
     */
    public function view(User $user, AirConditioner $airConditioner): bool
    {
        return $user->university_id === $airConditioner->room->building->university_id;
    }

    public function update(User $user, AirConditioner $airConditioner): bool
    {
        return $this->view($user, $airConditioner);
    }

    public function delete(User $user, AirConditioner $airConditioner): bool
    {
        return $this->view($user, $airConditioner);
    }
}
