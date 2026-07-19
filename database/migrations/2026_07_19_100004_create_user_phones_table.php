<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1NF fix: a user can have multiple phone numbers, so they get their
        // own table instead of phone_1/phone_2 columns (or a comma-joined
        // string) on users.
        Schema::create('user_phones', function (Blueprint $table) {
            $table->id();

            // 1:N — one user has many phone numbers, a phone number belongs
            // to exactly one user.
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete(); // a phone number has no meaning without its owner

            $table->string('phone_number');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'phone_number']); // no duplicate numbers for the same person
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_phones');
    }
};
