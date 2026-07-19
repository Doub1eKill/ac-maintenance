<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'active', 'verified'])
    ->name('dashboard');

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Buildings/rooms/units are explicitly org_admin's responsibility per the
// role hierarchy (super_admin "ไม่ผูกกับสถาบันใด" and has no university_id
// to scope by, so it's deliberately excluded here rather than special-cased
// per-controller). Every controller in this group must still scope queries
// by the logged-in admin's own university_id — this middleware only gates
// *which role* enters, not *which tenant's rows* they see once inside.
Route::middleware(['auth', 'active', 'role:org_admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(base_path('routes/admin.php'));

// Technician-only: scanning a unit's QR and logging maintenance work.
// Tenant check happens per-request inside the controllers (the uuid in the
// URL doesn't reveal which university it belongs to, so route-level
// middleware alone can't scope it — see AirConditionerPolicy::view()).
Route::middleware(['auth', 'active', 'role:technician'])
    ->prefix('tech')
    ->name('tech.')
    ->group(base_path('routes/technician.php'));

require __DIR__.'/auth.php';
