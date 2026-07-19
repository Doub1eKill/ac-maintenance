<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            // Second segment of ac_code (e.g. "B1"). Only needs to be
            // unique within its own university — the university abbreviation
            // prefix already disambiguates across tenants.
            $table->string('abbreviation', 10)->after('name');

            $table->unique(['university_id', 'abbreviation']);
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropUnique(['university_id', 'abbreviation']);
            $table->dropColumn('abbreviation');
        });
    }
};
