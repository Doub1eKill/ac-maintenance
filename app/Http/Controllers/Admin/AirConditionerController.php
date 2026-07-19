<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AirConditionerRequest;
use App\Models\AirConditioner;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AirConditionerController extends Controller
{
    public function index(): View
    {
        $airConditioners = AirConditioner::whereHas(
            'room.building',
            fn ($q) => $q->where('university_id', Auth::user()->university_id)
        )
            ->with(['room.building'])
            ->orderBy('ac_code')
            ->paginate(20);

        return view('admin.air-conditioners.index', compact('airConditioners'));
    }

    /**
     * Feeds the print-sticker-sheet view. Optionally filtered to one
     * building (?building_id=) so an admin can print stickers for just the
     * building they're currently walking through instead of the whole
     * university at once. No pagination on purpose — a print run needs
     * every matching unit on the sheet, not just one page of results.
     */
    public function print(): View
    {
        $universityId = Auth::user()->university_id;

        $buildings = Building::where('university_id', $universityId)->orderBy('name')->get();

        $airConditioners = AirConditioner::whereHas(
            'room.building',
            fn ($q) => $q->where('university_id', $universityId)
        )
            ->when(
                request('building_id'),
                fn ($q, $buildingId) => $q->whereHas('room', fn ($q) => $q->where('building_id', $buildingId))
            )
            ->with(['room.building'])
            ->orderBy('ac_code')
            ->get();

        return view('admin.air-conditioners.print', compact('buildings', 'airConditioners'));
    }

    public function create(): View
    {
        // Grouped by building so the <select> can show optgroups instead of
        // a flat list of every room in the university.
        $buildings = Building::where('university_id', Auth::user()->university_id)
            ->with(['rooms' => fn ($q) => $q->orderBy('name')])
            ->orderBy('name')
            ->get();

        return view('admin.air-conditioners.create', compact('buildings'));
    }

    public function store(AirConditionerRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            // Lock the room row so two concurrent registrations for the
            // same room can't both read "count = 3" and both generate
            // "...-04" — the second request blocks here until the first
            // transaction commits, then sees the unit it just created.
            $room = Room::where('id', $validated['room_id'])->lockForUpdate()->first();

            AirConditioner::create([
                'room_id' => $room->id,
                'ac_code' => AirConditioner::generateCodeForRoom($room),
                'qr_code' => (string) Str::uuid(),
                'brand' => $validated['brand'],
                'model' => $validated['model'] ?? null,
                'btu' => $validated['btu'] ?? null,
                'installed_at' => $validated['installed_at'] ?? null,
                'status' => $validated['status'],
            ]);
        });

        return redirect()->route('admin.air-conditioners.index')->with('status', 'Air conditioner registered.');
    }

    public function edit(AirConditioner $airConditioner): View
    {
        $this->authorize('update', $airConditioner);

        $airConditioner->load('room.building');

        return view('admin.air-conditioners.edit', compact('airConditioner'));
    }

    public function update(AirConditionerRequest $request, AirConditioner $airConditioner): RedirectResponse
    {
        $this->authorize('update', $airConditioner);

        $validated = $request->safe()->except('room_id'); // room_id is 'prohibited' on update, see AirConditionerRequest

        $airConditioner->update($validated);

        return redirect()->route('admin.air-conditioners.index')->with('status', 'Air conditioner updated.');
    }

    public function destroy(AirConditioner $airConditioner): RedirectResponse
    {
        $this->authorize('delete', $airConditioner);

        // maintenance_logs.air_conditioner_id is restrictOnDelete on purpose
        // (see migration) — same pattern as Building/Room destroy.
        if ($airConditioner->maintenanceLogs()->exists()) {
            return back()->withErrors([
                'air_conditioner' => 'Cannot delete a unit that already has maintenance history.',
            ]);
        }

        $airConditioner->delete();

        return redirect()->route('admin.air-conditioners.index')->with('status', 'Air conditioner deleted.');
    }
}
