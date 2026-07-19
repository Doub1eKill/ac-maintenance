<?php

namespace Database\Seeders;

use App\Models\AirConditioner;
use App\Models\University;
use Illuminate\Database\Seeder;

class AirConditionerSeeder extends Seeder
{
    public function run(): void
    {
        // university -> buildings -> rooms, so a unit can only ever land in
        // a room that belongs to that same university's building tree.
        University::with('buildings.rooms')->get()->each(function (University $university) {
            $university->buildings->each(function ($building) {
                $building->rooms->each(function ($room) {
                    AirConditioner::factory()
                        ->count(rand(1, 4))
                        ->create(['room_id' => $room->id]);
                });
            });
        });
    }
}
