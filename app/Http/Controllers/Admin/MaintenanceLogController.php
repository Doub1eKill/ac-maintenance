<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Yajra\DataTables\Facades\DataTables;

class MaintenanceLogController extends Controller
{
    /**
     * Page shell only — DataTables fetches rows itself from data() below via
     * AJAX. Server-side processing (not client-side) on purpose: this table
     * can grow to every maintenance event ever logged for an institution,
     * and client-side mode would mean shipping the entire history to the
     * browser on every page load just to display 25 rows of it.
     */
    public function index(): View
    {
        return view('admin.maintenance-logs.index');
    }

    public function data(Request $request): JsonResponse
    {
        $universityId = Auth::user()->university_id;

        $query = MaintenanceLog::query()
            // Tenant boundary: every row here is reached through
            // air_conditioner -> room -> building -> university, since
            // maintenance_logs doesn't carry university_id directly.
            ->whereHas(
                'airConditioner.room.building',
                fn ($q) => $q->where('university_id', $universityId)
            )
            ->with(['airConditioner', 'technician']);

        if ($request->filled('date_from')) {
            $query->whereDate('performed_at', '>=', $request->string('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('performed_at', '<=', $request->string('date_to'));
        }

        if ($request->filled('technician')) {
            $technicianName = $request->string('technician');
            $query->whereHas('technician', fn ($q) => $q->where('name', 'like', "%{$technicianName}%"));
        }

        return DataTables::of($query)
            ->addColumn('ac_code', fn (MaintenanceLog $log) => $log->airConditioner->ac_code)
            ->addColumn('technician_name', fn (MaintenanceLog $log) => $log->technician->name)
            ->editColumn('action', fn (MaintenanceLog $log) => match ($log->action) {
                'cleaning' => __('Cleaning'),
                'repair' => __('Repair'),
                'refill_refrigerant' => __('Refill Refrigerant'),
                default => $log->action,
            })
            ->editColumn('performed_at', fn (MaintenanceLog $log) => $log->performed_at->format('d M Y H:i'))
            ->rawColumns([])
            ->make(true);
    }
}
