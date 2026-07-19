<?php

namespace Database\Seeders;

use App\Models\University;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * org_admin/technician accounts, one university at a time. Never create
     * a batch of users first and assign university_id after the fact — that
     * pattern is exactly how a cross-tenant mistake sneaks in.
     */
    public function run(): void
    {
        University::all()->each(function (University $university) {
            User::factory()
                ->orgAdmin($university->id)
                ->create([
                    'name' => $university->name.' Admin',
                    'email' => 'admin@'.str($university->name)->slug().'.test',
                ]);

            User::factory()
                ->technician($university->id)
                ->count(rand(3, 6))
                ->create();
        });
    }
}
