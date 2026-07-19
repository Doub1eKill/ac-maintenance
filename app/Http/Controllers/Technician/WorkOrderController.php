<?php

namespace App\Http\Controllers\Technician;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WorkOrderController extends Controller
{
    /**
     * Claims one item from the university's shared pool. Two things this
     * guards against, both explicitly required for this feature:
     *
     * 1. Cross-tenant claim — university_id is denormalized onto
     *    work_orders precisely so this check doesn't need a join.
     * 2. Two technicians claiming the same order at once — the whole
     *    "first to claim gets it" pool model breaks without this. The
     *    lockForUpdate() forces the second concurrent request to wait for
     *    the first transaction to commit, then see status already
     *    'claimed' and back off, instead of both succeeding.
     */
    public function claim(WorkOrder $workOrder): RedirectResponse
    {
        $user = Auth::user();

        if ($workOrder->university_id !== $user->university_id) {
            abort(403);
        }

        $claimed = DB::transaction(function () use ($workOrder, $user) {
            $locked = WorkOrder::where('id', $workOrder->id)->lockForUpdate()->first();

            if ($locked->status !== 'pending') {
                return false;
            }

            $locked->update([
                'status' => 'claimed',
                'claimed_by' => $user->id,
                'claimed_at' => now(),
            ]);

            return true;
        });

        if (! $claimed) {
            return back()->withErrors([
                'work_order' => 'This job has already been claimed by someone else.',
            ]);
        }

        // Straight to the log form (not the scan page or dashboard) with
        // work_order_id attached, so submitting that form is what closes
        // this job — see MaintenanceLogController@store.
        return redirect()->route('tech.maintenance-logs.create', [
            'qrCode' => $workOrder->airConditioner->qr_code,
            'work_order_id' => $workOrder->id,
        ]);
    }
}
