<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\BuildingRequest;
use App\Models\Building;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class BuildingController extends Controller
{
    /**
     * Every query below is scoped to the logged-in admin's own
     * university_id — never trust a route parameter alone to prove
     * tenant ownership (see BuildingPolicy for the object-level check
     * used on edit/update/destroy).
     */
    public function index(): View
    {
        $buildings = Building::where('university_id', Auth::user()->university_id)
            ->withCount('rooms')
            ->orderBy('name')
            ->paginate(15);

        return view('admin.buildings.index', compact('buildings'));
    }

    public function create(): View
    {
        return view('admin.buildings.create');
    }

    public function store(BuildingRequest $request): RedirectResponse
    {
        Building::create([
            'university_id' => Auth::user()->university_id, // never trust client input for the tenant column
            'name' => $request->validated('name'),
            'abbreviation' => strtoupper($request->validated('abbreviation')),
        ]);

        return redirect()->route('admin.buildings.index')->with('status', 'Building created.');
    }

    public function edit(Building $building): View
    {
        $this->authorize('update', $building);

        return view('admin.buildings.edit', compact('building'));
    }

    public function update(BuildingRequest $request, Building $building): RedirectResponse
    {
        $this->authorize('update', $building);

        $building->update([
            'name' => $request->validated('name'),
            'abbreviation' => strtoupper($request->validated('abbreviation')),
        ]);

        return redirect()->route('admin.buildings.index')->with('status', 'Building updated.');
    }

    public function destroy(Building $building): RedirectResponse
    {
        $this->authorize('delete', $building);

        // rooms.building_id is restrictOnDelete on purpose (see migration) —
        // catch the FK violation and turn it into a clear message instead of
        // a raw 500.
        if ($building->rooms()->exists()) {
            return back()->withErrors([
                'building' => 'Cannot delete a building that still has rooms. Move or delete its rooms first.',
            ]);
        }

        $building->delete();

        return redirect()->route('admin.buildings.index')->with('status', 'Building deleted.');
    }
}
