<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Room>
 */
class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        $floor = fake()->numberBetween(1, 8);

        return [
            'building_id' => Building::factory(),
            // Globally unique room number avoids collisions with the
            // (building_id, name) unique index when a building gets
            // several rooms seeded in the same run.
            'name' => $floor.'-'.fake()->unique()->numberBetween(100, 999999),
            'floor' => $floor,
        ];
    }
}
