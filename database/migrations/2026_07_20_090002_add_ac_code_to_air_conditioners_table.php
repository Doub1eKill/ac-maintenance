<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('air_conditioners', function (Blueprint $table) {
            // Human-readable, globally-unique reference code
            // (e.g. "PKRU-B1-101-01"), separate from qr_code (uuid).
            // qr_code exists so an external scanner never has to see or
            // guess a meaningful code; ac_code exists so a human can read
            // a label/print-out and know exactly which unit it is without
            // scanning anything.
            $table->string('ac_code')->unique()->after('room_id');
        });
    }

    public function down(): void
    {
        Schema::table('air_conditioners', function (Blueprint $table) {
            $table->dropColumn('ac_code');
        });
    }
};
