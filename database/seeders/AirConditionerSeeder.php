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
                    // One at a time (not ->count(n)->create()) so each unit's
                    // ac_code sees the previous one already committed —
                    // ->count(n)->create() would compute the same "next
                    // sequence" for every row in the batch and collide.
                    foreach (range(1, rand(1, 4)) as $i) {
                        AirConditioner::factory()->create([
                            'room_id' => $room->id,
                            'ac_code' => AirConditioner::generateCodeForRoom($room),
                        ]);
                    }
                });
            });
        });
    }
}
