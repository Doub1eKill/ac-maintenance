<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();

            // 1:N — one building has many rooms, a room belongs to one building.
            // NOTE (deliberately normalized): university_id is NOT duplicated
            // here. Tenant is derived via rooms -> buildings -> university.
            // Revisit only if a hot query path needs a direct tenant filter
            // on rooms at scale — that would be an explicit denormalization,
            // not an accident.
            $table->foreignId('building_id')
                ->constrained()
                ->restrictOnDelete(); // force explicit room reassignment before a building can be removed

            $table->string('name'); // room number/label, e.g. "301", "Server Room A"
            $table->unsignedSmallInteger('floor')->nullable();
            $table->timestamps();

            // A room label only needs to be unique within its own building.
            $table->unique(['building_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
