<?php

namespace App\Http\Controllers;

use App\Models\University;
use App\Models\WorkOrder;
use App\Services\AirConditionerStatsService;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __construct(private readonly AirConditionerStatsService $stats) {}

    /**
     * One shared /dashboard route for every role (Breeze's default
     * post-login redirect target), branching by role rather than having
     * three separate routes — keeps the "where does a logged-in user land"
     * decision in one place.
     */
    public function index(): View
    {
        $user = Auth::user();

        if ($user->isTechnician()) {
            // university_id being denormalized on work_orders is exactly
            // what makes this a single flat WHERE instead of a 3-level
            // join, on a page a technician may reload often.
            $pendingWorkOrders = WorkOrder::where('university_id', $user->university_id)
                ->where('status', 'pending')
                ->with('airConditioner.room.building')
                ->oldest() // longest-overdue pool item first
                ->get();

            return view('technician.home', compact('pendingWorkOrders'));
        }

        if ($user->isSuperAdmin()) {
            return $this->superAdminDashboard();
        }

        // org_admin: always their own university, never a choice — this is
        // the tenant-scoping boundary for this whole dashboard.
        return view('admin.dashboard', [
            'stats' => $this->stats->forUniversity($user->university_id),
            'universities' => null,
            'selectedUniversity' => null,
            'breakdown' => null,
            'lastCleanedList' => $this->stats->lastCleanedList($user->university_id),
        ]);
    }

    private function superAdminDashboard(): View
    {
        $selectedUniversity = null;

        if ($universityId = request()->integer('university_id') ?: null) {
            $selectedUniversity = University::findOrFail($universityId);
        }

        return view('admin.dashboard', [
            'stats' => $this->stats->forUniversity($selectedUniversity?->id),
            'universities' => University::orderBy('name')->get(),
            'selectedUniversity' => $selectedUniversity,
            // Only needed for the combined ("all institutions") view — once
            // one institution is picked, its own $stats already says enough.
            'breakdown' => $selectedUniversity === null ? $this->stats->perUniversityBreakdown() : null,
            // Same reasoning as $breakdown being combined-view-only, but
            // inverted: a flat per-unit list only makes sense once ONE
            // institution is in view, never mixed across all of them.
            'lastCleanedList' => $selectedUniversity !== null ? $this->stats->lastCleanedList($selectedUniversity->id) : null,
        ]);
    }
}
