<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Separate from `role` on purpose: role is "what this account is",
            // status is "is this account allowed to operate right now".
            // Conflating them (e.g. a role='pending') would mean re-deriving
            // the intended role again at approval time instead of just
            // flipping one column.
            // Default 'pending' is deny-by-default: any user row created by
            // code that forgets to set status explicitly starts locked out
            // rather than accidentally active.
            $table->enum('status', ['pending', 'active', 'suspended'])
                ->default('pending')
                ->after('role');

            $table->index(['university_id', 'status']); // "pending approvals for my university"
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['university_id', 'status']);
            $table->dropColumn('status');
        });
    }
};
