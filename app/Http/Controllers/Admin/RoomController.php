<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoomRequest;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class RoomController extends Controller
{
    /**
     * Nested under a building (/admin/buildings/{building}/rooms), so the
     * tenant check happens on the parent building before anything about
     * rooms is even queried.
     */
    public function index(Building $building): View
    {
        $this->authorize('view', $building);

        $rooms = $building->rooms()->withCount('airConditioners')->orderBy('name')->paginate(15);

        return view('admin.rooms.index', compact('building', 'rooms'));
    }

    public function create(Building $building): View
    {
        $this->authorize('view', $building);

        return view('admin.rooms.create', compact('building'));
    }

    public function store(RoomRequest $request, Building $building): RedirectResponse
    {
        $this->authorize('view', $building);

        $building->rooms()->create($request->validated());

        return redirect()->route('admin.buildings.rooms.index', $building)->with('status', 'Room created.');
    }

    /**
     * Shallow routes from here down (/admin/rooms/{room}) — the building is
     * no longer in the URL, so RoomPolicy (which joins through to the
     * building) is the only thing enforcing tenant ownership.
     */
    public function edit(Room $room): View
    {
        $this->authorize('update', $room);

        return view('admin.rooms.edit', compact('room'));
    }

    public function update(RoomRequest $request, Room $room): RedirectResponse
    {
        $this->authorize('update', $room);

        $room->update($request->validated());

        return redirect()->route('admin.buildings.rooms.index', $room->building_id)->with('status', 'Room updated.');
    }

    public function destroy(Room $room): RedirectResponse
    {
        $this->authorize('delete', $room);

        // air_conditioners.room_id is restrictOnDelete — same reasoning as
        // BuildingController::destroy.
        if ($room->airConditioners()->exists()) {
            return back()->withErrors([
                'room' => 'Cannot delete a room that still has air conditioners assigned. Reassign or remove them first.',
            ]);
        }

        $buildingId = $room->building_id;
        $room->delete();

        return redirect()->route('admin.buildings.rooms.index', $buildingId)->with('status', 'Room deleted.');
    }
}
