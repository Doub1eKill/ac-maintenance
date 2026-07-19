<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    /**
     * Runs exactly once, outside any university loop — super_admin is a
     * platform-level role and must never be attached to a tenant.
     */
    public function run(): void
    {
        User::factory()
            ->superAdmin()
            ->create([
                'name' => 'Platform Super Admin',
                'email' => 'superadmin@ac-maintenance.test',
            ]);
    }
}
