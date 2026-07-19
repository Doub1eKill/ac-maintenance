<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserPhone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserPhone>
 */
class UserPhoneFactory extends Factory
{
    protected $model = UserPhone::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'phone_number' => fake()->unique()->numerify('08#-###-####'),
            'is_primary' => true,
        ];
    }
}
