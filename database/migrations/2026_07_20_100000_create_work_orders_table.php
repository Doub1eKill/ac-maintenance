<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();

            // 1:N — one unit accumulates many work orders over its lifetime
            // (it goes overdue again every cycle after being cleaned).
            // Never CASCADE: a unit's work order history is maintenance
            // accountability, same reasoning as maintenance_logs.
            $table->foreignId('air_conditioner_id')
                ->constrained()
                ->restrictOnDelete();

            // Deliberately denormalized (the team's default is NOT to do
            // this — see rooms/air_conditioners/maintenance_logs, which all
            // derive tenant via join). Justified here for two reasons:
            // 1) the technician pool page queries "pending work orders for
            //    my university" on every dashboard load — a genuinely hot
            //    path, unlike the occasional admin list queries elsewhere.
            // 2) zero staleness risk: air_conditioners.room_id is immutable
            //    after creation (AirConditionerRequest makes it 'prohibited'
            //    on update), so the university a unit belongs to can never
            //    change out from under this column once set.
            $table->foreignId('university_id')
                ->constrained()
                ->restrictOnDelete(); // don't cascade-wipe a tenant's whole work order history

            $table->enum('status', ['pending', 'claimed', 'completed', 'cancelled'])
                ->default('pending');

            // Optional reference — null until a technician claims the
            // pool item. nullOnDelete is a safety net more than an expected
            // path: this app never hard-deletes users (accounts are
            // suspended via users.status instead), but the FK still
            // shouldn't block on the rare case of manual DB intervention.
            $table->foreignId('claimed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Separate from updated_at: updated_at gets overwritten again
            // when the order later moves to completed/cancelled, so the
            // moment of claiming needs its own column to stay queryable.
            $table->timestamp('claimed_at')->nullable();

            $table->timestamps();

            // Pool-of-pending-work-for-this-university, sorted oldest-first.
            $table->index(['university_id', 'status', 'created_at']);

            // "Does this unit already have an open work order?" — checked
            // by the scheduled command before creating a new one.
            $table->index(['air_conditioner_id', 'status']);

            $table->index('claimed_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
