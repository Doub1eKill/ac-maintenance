<?php

namespace App\Services;

use App\Models\AirConditioner;
use App\Models\University;
use Illuminate\Support\Collection;

class AirConditionerStatsService
{
    /**
     * @return array{total: int, normal: int, needs_cleaning: int, broken: int}
     */
    public function forUniversity(?int $universityId): array
    {
        $query = AirConditioner::query();

        // Null means "no tenant filter" — only ever passed by super_admin's
        // combined view. org_admin always calls this with their own
        // university_id, never null.
        if ($universityId !== null) {
            $query->whereHas('room.building', fn ($q) => $q->where('university_id', $universityId));
        }

        return [
            'total' => (clone $query)->count(),
            'normal' => (clone $query)->where('status', 'normal')->count(),
            'needs_cleaning' => (clone $query)->where('status', 'needs_cleaning')->count(),
            'broken' => (clone $query)->where('status', 'broken')->count(),
        ];
    }

    /**
     * Per-institution breakdown for super_admin's combined overview — a
     * single "128 units total" number isn't actionable on its own, so the
     * overview also needs to show which institution that total is made of.
     *
     * @return Collection<int, array{university: University, stats: array}>
     */
    public function perUniversityBreakdown(): Collection
    {
        return University::orderBy('name')->get()
            ->map(fn (University $university) => [
                'university' => $university,
                'stats' => $this->forUniversity($university->id),
            ]);
    }

    /**
     * Every unit in one institution with its last-cleaned date and whether
     * it already has an open (pending/claimed) work order, sorted
     * longest-overdue first. Requires a concrete university_id (never null)
     * — unlike forUniversity()'s combined-overview mode, a single flat list
     * mixing every institution's equipment isn't something an admin can act
     * on, so this is only ever shown once one institution is in view.
     *
     * @return Collection<int, AirConditioner>
     */
    public function lastCleanedList(int $universityId): Collection
    {
        return AirConditioner::query()
            ->whereHas('room.building', fn ($q) => $q->where('university_id', $universityId))
            ->with('room.building')
            // withMax/withCount run as correlated subqueries in the same
            // query as the main SELECT — one round trip instead of N+1
            // per unit for "last cleaned" and "has an open work order".
            ->withMax(['maintenanceLogs as last_cleaned_at' => fn ($q) => $q->where('action', 'cleaning')], 'performed_at')
            ->withCount(['workOrders as open_work_orders_count' => fn ($q) => $q->whereIn('status', ['pending', 'claimed'])])
            ->get()
            // Never-cleaned units are sorted by their registration date
            // instead (same "count from registration" rule the scheduled
            // command uses) — done in PHP rather than SQL because the
            // fallback is conditional per row (COALESCE would need casting
            // both sides to the same type, and this list is one
            // institution's worth of rows, not a hot/large-scale query).
            ->sortBy(fn (AirConditioner $ac) => $ac->last_cleaned_at ?? $ac->created_at)
            ->values();
    }
}
