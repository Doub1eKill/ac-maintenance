<?php

namespace Database\Factories;

use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<University>
 */
class UniversityFactory extends Factory
{
    protected $model = University::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company().' University',
            'address' => fake()->address(),
            'phone' => fake()->numerify('0#-###-####'),
        ];
    }
}
