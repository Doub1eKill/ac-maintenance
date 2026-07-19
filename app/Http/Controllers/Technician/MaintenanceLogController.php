<?php

namespace App\Http\Controllers\Technician;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceLogRequest;
use App\Models\AirConditioner;
use App\Models\MaintenanceLog;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class MaintenanceLogController extends Controller
{
    /**
     * Reached either from the scan page's "Log Maintenance" button, or
     * (with ?work_order_id=) right after claiming a pool job — same
     * qrCode -> AirConditioner -> tenant-check pattern as ScanController.
     */
    public function create(Request $request, string $qrCode): View
    {
        $airConditioner = AirConditioner::where('qr_code', $qrCode)
            ->with('room.building')
            ->firstOrFail();

        $this->authorize('view', $airConditioner);

        // If a work_order_id is present but doesn't actually belong to this
        // technician/unit, just fall through to a plain ad-hoc log instead
        // of erroring — the same re-check happens for real in
        // StoreMaintenanceLogRequest before anything is written.
        $workOrder = null;
        if ($request->filled('work_order_id')) {
            $workOrder = WorkOrder::where('id', $request->integer('work_order_id'))
                ->where('air_conditioner_id', $airConditioner->id)
                ->where('claimed_by', Auth::id())
                ->where('status', 'claimed')
                ->first();
        }

        return view('technician.maintenance-logs.create', compact('airConditioner', 'workOrder'));
    }

    /**
     * air_conditioner_id is the only thing trusted from the request (to
     * know *which* unit — and even that is re-checked for tenant ownership
     * inside StoreMaintenanceLogRequest). user_id and performed_at are
     * never read from input: a technician logging work for someone else,
     * or backdating/postdating a log, would corrupt the maintenance
     * history's accountability — so both are fixed here from the
     * authenticated session and the server clock.
     */
    public function store(StoreMaintenanceLogRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $airConditioner = AirConditioner::findOrFail($validated['air_conditioner_id']);

        DB::transaction(function () use ($validated, $airConditioner) {
            MaintenanceLog::create([
                'air_conditioner_id' => $airConditioner->id,
                'work_order_id' => $validated['work_order_id'] ?? null,
                'user_id' => Auth::id(),
                'action' => $validated['action'],
                'notes' => $validated['notes'] ?? null,
                'performed_at' => now(),
            ]);

            // This is what actually closes the pool job — logging the work
            // is the completion event, there's no separate "mark complete"
            // button.
            if (! empty($validated['work_order_id'])) {
                WorkOrder::where('id', $validated['work_order_id'])->update(['status' => 'completed']);
            }
        });

        return redirect()
            ->route('tech.scan.show', $airConditioner->qr_code)
            ->with('status', 'Maintenance logged.');
    }
}
