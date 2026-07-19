<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Central transaction table. Conceptually this is how the M:N
        // "which technicians worked on which units" history gets captured —
        // but because each row is a timestamped event with its own
        // attributes (action, notes, performed_at), it's modeled as a full
        // log table with two 1:N foreign keys feeding into it, not a bare
        // pivot table.
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->id();

            // 1:N — one air conditioner has many maintenance events over its
            // lifetime. Never CASCADE: a physical asset's repair history
            // must survive independently of the asset record's lifecycle.
            $table->foreignId('air_conditioner_id')
                ->constrained()
                ->restrictOnDelete();

            // 1:N — one technician performs many maintenance events. Never
            // CASCADE: deleting/deactivating a technician account must not
            // erase the historical record of work they performed. RESTRICT
            // over SET NULL on purpose — a log without a technician loses
            // accountability, so the app must deactivate (not hard-delete)
            // a technician who has log history instead.
            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->enum('action', ['cleaning', 'repair', 'refill_refrigerant']);
            $table->text('notes')->nullable();
            $table->dateTime('performed_at');
            $table->timestamps();

            // Equality filter (which unit) first, then range/sort (recent-first history).
            $table->index(['air_conditioner_id', 'performed_at']);
            $table->index('user_id'); // "all logs by this technician"
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
    }
};
