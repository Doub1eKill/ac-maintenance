<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Kept as an ALTER migration (rather than editing Laravel's default
        // create_users_table migration) so password_reset_tokens/sessions,
        // created in that same file, stay untouched.
        Schema::table('users', function (Blueprint $table) {
            // 1:N — one university has many user accounts, a user belongs to
            // at most one university. Nullable is intentional: super_admin
            // is a platform-level role with no tenant, so it must NOT be
            // forced onto a university just to satisfy a NOT NULL column.
            // Application layer must enforce: role = 'super_admin' <=> university_id IS NULL.
            $table->foreignId('university_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->restrictOnDelete(); // deleting a tenant must not silently orphan/erase its staff accounts

            // MySQL-level enum keeps the 3-tier role hierarchy enforced in
            // the schema itself, not just in app validation. Trade-off:
            // adding a new role later requires a migration (ALTER ... MODIFY),
            // which is an acceptable cost for a role list that changes rarely.
            $table->enum('role', ['super_admin', 'org_admin', 'technician'])
                ->default('technician')
                ->after('university_id');

            $table->index(['university_id', 'role']); // "all org_admins/technicians of this university"
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['university_id']);
            $table->dropIndex(['university_id', 'role']);
            $table->dropColumn(['university_id', 'role']);
        });
    }
};
