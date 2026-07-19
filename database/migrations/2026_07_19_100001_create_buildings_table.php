<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buildings', function (Blueprint $table) {
            $table->id();

            // 1:N — one university has many buildings, a building belongs to
            // exactly one university. This FK is the start of the tenant
            // boundary, so it leads every composite index below it in the tree.
            $table->foreignId('university_id')
                ->constrained()
                ->restrictOnDelete(); // deleting a tenant must not silently wipe its buildings/rooms/units

            $table->string('name');
            $table->timestamps();

            // A building name only needs to be unique within its own university.
            $table->unique(['university_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
