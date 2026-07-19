<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserPhone;
use Illuminate\Database\Seeder;

class UserPhoneSeeder extends Seeder
{
    public function run(): void
    {
        // Phones belong to a user directly (already tenant-correct via
        // user_id), so no university loop is needed here — just attach 1-2
        // numbers to every seeded user, super_admin included.
        User::all()->each(function (User $user) {
            UserPhone::factory()
                ->count(rand(1, 2))
                ->sequence(['is_primary' => true], ['is_primary' => false])
                ->create(['user_id' => $user->id]);
        });
    }
}
