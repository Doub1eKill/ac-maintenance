<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // No university_id / role default here on purpose: role dictates
            // whether university_id may be null (super_admin) or must be set
            // (org_admin/technician), so state methods below own that pairing
            // instead of the base definition guessing at it.
            'university_id' => null,
            'role' => 'technician',
            // Factory/seeded users represent already-provisioned staff, not
            // self-registrations, so they default to 'active' — the DB
            // column default stays 'pending' for anything created outside
            // the factory (e.g. the public registration form).
            'status' => 'active',
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Platform-level role, never tied to a university.
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
            'university_id' => null,
        ]);
    }

    /**
     * Manages one university's buildings/rooms/units/technicians.
     */
    public function orgAdmin(int $universityId): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'org_admin',
            'university_id' => $universityId,
        ]);
    }

    /**
     * Scans QR codes and logs maintenance work for one university.
     */
    public function technician(int $universityId): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'technician',
            'university_id' => $universityId,
        ]);
    }

    /**
     * Mirrors a fresh self-registration awaiting org_admin approval.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }
}
