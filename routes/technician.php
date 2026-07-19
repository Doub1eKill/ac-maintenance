<?php

use App\Http\Controllers\Technician\MaintenanceLogController;
use App\Http\Controllers\Technician\ScanController;
use App\Http\Controllers\Technician\WorkOrderController;
use Illuminate\Support\Facades\Route;

// All routes here already run under: auth, active, role:technician
// (see routes/web.php).

Route::get('scan/{qrCode}', [ScanController::class, 'show'])->name('scan.show');

Route::get('scan/{qrCode}/log', [MaintenanceLogController::class, 'create'])->name('maintenance-logs.create');
Route::post('maintenance-logs', [MaintenanceLogController::class, 'store'])->name('maintenance-logs.store');

Route::post('work-orders/{workOrder}/claim', [WorkOrderController::class, 'claim'])->name('work-orders.claim');
