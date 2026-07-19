<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Root of the tenant tree. Every other tenant-scoped table
        // (directly or via a parent) traces back to a university.
        Schema::create('universities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // natural key of the institution
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('universities');
    }
};
