<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    protected $model = Building::class;

    public function definition(): array
    {
        return [
            // Overridden by the seeder for every real run — a factory default
            // must still exist so Building::factory()->make()/tests work standalone.
            'university_id' => University::factory(),
            // Suffixed with a globally-unique number so repeated runs of
            // rand(2, 5) per university never collide with the
            // (university_id, name) unique index.
            'name' => fake()->randomElement(['Engineering', 'Science', 'Library', 'Administration', 'Dormitory'])
                .' Building '.fake()->unique()->numberBetween(100, 999999),
        ];
    }
}
