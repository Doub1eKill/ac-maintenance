<?php

namespace App\Policies;

use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
    /**
     * Tenant derives through room -> building (rooms don't carry
     * university_id directly — see the normalization note in the rooms
     * migration), so the check follows that same join.
     */
    public function view(User $user, Room $room): bool
    {
        return $user->university_id === $room->building->university_id;
    }

    public function update(User $user, Room $room): bool
    {
        return $this->view($user, $room);
    }

    public function delete(User $user, Room $room): bool
    {
        return $this->view($user, $room);
    }
}
