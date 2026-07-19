<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_logs', function (Blueprint $table) {
            // Nullable: most logs aren't tied to an auto-generated work
            // order (a technician can log ad-hoc work anytime, not just
            // from the pool). When it IS set, this is what closes the loop
            // back to the work order that prompted the visit.
            // nullOnDelete: the maintenance record is the log has independent
            // value as history — it must survive even if the work order
            // itself is later deleted or cancelled.
            $table->foreignId('work_order_id')
                ->nullable()
                ->after('air_conditioner_id')
                ->constrained()
                ->nullOnDelete();

            $table->index('work_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->dropForeign(['work_order_id']);
            $table->dropIndex(['work_order_id']);
            $table->dropColumn('work_order_id');
        });
    }
};
