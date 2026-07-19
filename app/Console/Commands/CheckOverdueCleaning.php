<?php

namespace App\Console\Commands;

use App\Models\AirConditioner;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckOverdueCleaning extends Command
{
    protected $signature = 'maintenance:check-overdue-cleaning';

    protected $description = 'Create a pending work order for every unit overdue for cleaning (3+ months since last clean, or since registration if never cleaned)';

    public function handle(): int
    {
        $cutoff = now()->subMonths(3);
        $created = 0;

        // chunkById (not chunk) so units are still walked correctly even as
        // work_orders get inserted mid-run — chunk() re-runs the same
        // LIMIT/OFFSET window each pass and can skip/repeat rows if the
        // underlying result set shifts, chunkById keys off the last seen id
        // instead. This is a daily batch job, not a user-facing request, so
        // the per-unit queries below trade a little N+1 overhead for
        // straightforward, obviously-correct logic.
        AirConditioner::with('room.building')->chunkById(100, function ($units) use ($cutoff, &$created) {
            foreach ($units as $unit) {
                $lastCleanedAt = $unit->maintenanceLogs()
                    ->where('action', 'cleaning')
                    ->max('performed_at');

                // Never cleaned yet -> count from when the unit was
                // registered, not from "the beginning of time".
                $lastCleanedAt = $lastCleanedAt ? Carbon::parse($lastCleanedAt) : $unit->created_at;

                if ($lastCleanedAt->gt($cutoff)) {
                    continue; // not overdue yet
                }

                // Constraint: never create a duplicate work order for a unit
                // that already has one open. This IS a race-free check here
                // because this command only ever runs once a day via the
                // scheduler (not from concurrent web requests), so a simple
                // exists()-then-create is enough — no lockForUpdate needed,
                // unlike the claim endpoint which two technicians could hit
                // at the same instant.
                $hasOpenWorkOrder = $unit->workOrders()
                    ->whereIn('status', ['pending', 'claimed'])
                    ->exists();

                if ($hasOpenWorkOrder) {
                    continue;
                }

                $unit->workOrders()->create([
                    'university_id' => $unit->room->building->university_id,
                    'status' => 'pending',
                ]);

                $created++;
            }
        });

        $this->info("Created {$created} work order(s) for overdue cleaning.");

        return self::SUCCESS;
    }
}
