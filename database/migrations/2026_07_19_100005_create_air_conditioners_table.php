<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('air_conditioners', function (Blueprint $table) {
            $table->id();

            // 1:N — one room can contain several units, each unit sits in
            // exactly one room at a time. university_id is intentionally NOT
            // duplicated here either — same normalized-by-default reasoning
            // as rooms.building_id.
            $table->foreignId('room_id')
                ->constrained()
                ->restrictOnDelete(); // force explicit reassignment/retirement of units before a room is removed

            // UUID rather than the surrogate BIGINT id: this value gets
            // printed on a physical QR sticker and scanned by anyone with
            // physical access to the unit, so it must not leak or allow
            // guessing the internal auto-increment id (or its row count).
            $table->uuid('qr_code')->unique();

            $table->string('brand');
            $table->string('model')->nullable();
            $table->unsignedInteger('btu')->nullable();
            $table->date('installed_at')->nullable();
            $table->enum('status', ['normal', 'broken', 'needs_cleaning'])->default('normal');
            $table->timestamps();

            $table->index('room_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('air_conditioners');
    }
};
