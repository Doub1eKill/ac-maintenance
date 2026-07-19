<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Order matters: parent entities before children, and every
     * tenant-scoped seeder loops per-university internally so cross-tenant
     * data can never be created by accident.
     */
    public function run(): void
    {
        $this->call([
            SuperAdminSeeder::class,   // once, outside any tenant loop
            UniversitySeeder::class,   // tenants
            BuildingSeeder::class,     // per university
            RoomSeeder::class,         // per building
            AirConditionerSeeder::class, // per room
            UserSeeder::class,         // org_admin + technicians, per university
            UserPhoneSeeder::class,    // per user
            MaintenanceLogSeeder::class, // per university's own units + technicians
        ]);
    }
}
