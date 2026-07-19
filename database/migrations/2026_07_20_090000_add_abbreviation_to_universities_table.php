<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            // Feeds the first segment of ac_code (e.g. "PKRU-B1-101-01").
            // Unique system-wide because ac_code itself must be — this is
            // the piece that makes the whole composite globally unique
            // without needing a separate global counter.
            $table->string('abbreviation', 10)->unique()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->dropColumn('abbreviation');
        });
    }
};
