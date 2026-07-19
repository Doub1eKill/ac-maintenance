<?php

use App\Http\Controllers\Admin\AirConditionerController;
use App\Http\Controllers\Admin\AirConditionerQrCodeController;
use App\Http\Controllers\Admin\BuildingController;
use App\Http\Controllers\Admin\MaintenanceLogController;
use App\Http\Controllers\Admin\RoomController;
use Illuminate\Support\Facades\Route;

// All routes here already run under: auth, active, role:org_admin
// (see routes/web.php).

Route::resource('buildings', BuildingController::class)->except(['show']);

// Shallow: index/create/store need the parent building_id from the URL,
// but edit/update/destroy operate on a room whose building is already known
// (via building_id), so those don't repeat /buildings/{building}/ in the URL.
Route::resource('buildings.rooms', RoomController::class)->shallow()->except(['show']);

// Registered before the resource route below so "print" is never captured
// by the resource's {air_conditioner} wildcard.
Route::get('air-conditioners/print', [AirConditionerController::class, 'print'])
    ->name('air-conditioners.print');

// Flat (not nested under room) — an org_admin manages air conditioners
// across their whole university, not one room at a time. The create form
// picks the room via a grouped dropdown instead of the URL.
Route::resource('air-conditioners', AirConditionerController::class)->except(['show']);

Route::get('air-conditioners/{air_conditioner}/qr-code', [AirConditionerQrCodeController::class, 'show'])
    ->name('air-conditioners.qr-code');

Route::get('maintenance-logs', [MaintenanceLogController::class, 'index'])->name('maintenance-logs.index');
Route::get('maintenance-logs/data', [MaintenanceLogController::class, 'data'])->name('maintenance-logs.data');
