<?php

namespace Database\Factories;

use App\Models\AirConditioner;
use App\Models\MaintenanceLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaintenanceLog>
 */
class MaintenanceLogFactory extends Factory
{
    protected $model = MaintenanceLog::class;

    public function definition(): array
    {
        return [
            'air_conditioner_id' => AirConditioner::factory(),
            'user_id' => User::factory(),
            'action' => fake()->randomElement(['cleaning', 'repair', 'refill_refrigerant']),
            'notes' => fake()->optional()->sentence(),
            'performed_at' => fake()->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
