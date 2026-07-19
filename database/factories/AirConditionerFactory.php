<?php

namespace Database\Factories;

use App\Models\AirConditioner;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AirConditioner>
 */
class AirConditionerFactory extends Factory
{
    protected $model = AirConditioner::class;

    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            'qr_code' => Str::uuid(),
            'brand' => fake()->randomElement(['Daikin', 'Mitsubishi Electric', 'Panasonic', 'LG', 'Carrier']),
            'model' => strtoupper(fake()->bothify('??-####')),
            'btu' => fake()->randomElement([9000, 12000, 18000, 24000, 36000]),
            'installed_at' => fake()->dateTimeBetween('-5 years', '-1 month'),
            'status' => fake()->randomElement(['normal', 'broken', 'needs_cleaning']),
        ];
    }
}
