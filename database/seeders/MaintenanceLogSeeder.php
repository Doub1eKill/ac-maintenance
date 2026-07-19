<?php

namespace Database\Seeders;

use App\Models\AirConditioner;
use App\Models\MaintenanceLog;
use App\Models\University;
use App\Models\User;
use Illuminate\Database\Seeder;

class MaintenanceLogSeeder extends Seeder
{
    public function run(): void
    {
        University::all()->each(function (University $university) {
            // Pull only this university's own units and technicians so a
            // log can never pair a technician from one tenant with a unit
            // from another.
            $airConditioners = AirConditioner::whereHas(
                'room.building',
                fn ($query) => $query->where('university_id', $university->id)
            )->get();

            $technicians = User::where('university_id', $university->id)
                ->where('role', 'technician')
                ->get();

            if ($technicians->isEmpty()) {
                return; // nothing to assign the log to for this university
            }

            $airConditioners->each(function (AirConditioner $airConditioner) use ($technicians) {
                MaintenanceLog::factory()
                    ->count(rand(1, 5))
                    ->create([
                        'air_conditioner_id' => $airConditioner->id,
                        'user_id' => $technicians->random()->id, // always drawn from this same university's pool
                    ]);
            });
        });
    }
}
