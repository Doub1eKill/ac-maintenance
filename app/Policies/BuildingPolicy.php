<?php

namespace App\Policies;

use App\Models\Building;
use App\Models\User;

class BuildingPolicy
{
    /**
     * Single source of truth for "may this admin touch this building".
     * A URL like /admin/buildings/{id}/edit is guessable, so route-model
     * binding alone isn't enough — this is what stops an org_admin from
     * one university reaching another university's building by ID.
     */
    public function view(User $user, Building $building): bool
    {
        return $user->university_id === $building->university_id;
    }

    public function update(User $user, Building $building): bool
    {
        return $this->view($user, $building);
    }

    public function delete(User $user, Building $building): bool
    {
        return $this->view($user, $building);
    }
}
