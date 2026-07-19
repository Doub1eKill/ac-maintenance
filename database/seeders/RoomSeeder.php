<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\University;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        // Loop university -> its own buildings only, so a room can never
        // attach to a building that belongs to a different tenant.
        University::with('buildings')->get()->each(function (University $university) {
            $university->buildings->each(function ($building) {
                Room::factory()
                    ->count(rand(3, 10))
                    ->create(['building_id' => $building->id]);
            });
        });
    }
}
