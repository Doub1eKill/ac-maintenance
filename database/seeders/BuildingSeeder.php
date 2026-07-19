<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\University;
use Illuminate\Database\Seeder;

class BuildingSeeder extends Seeder
{
    public function run(): void
    {
        University::all()->each(function (University $university) {
            Building::factory()
                ->count(rand(2, 5))
                ->create(['university_id' => $university->id]); // always bound to the current tenant
        });
    }
}
