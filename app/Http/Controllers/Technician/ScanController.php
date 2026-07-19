<?php

namespace App\Http\Controllers\Technician;

use App\Http\Controllers\Controller;
use App\Models\AirConditioner;
use Illuminate\View\View;

class ScanController extends Controller
{
    /**
     * $qrCode is the uuid embedded in the physical QR sticker — looked up
     * directly (not via route-model-binding on the primary key) since the
     * scanner never sees the internal id.
     *
     * firstOrFail() -> 404 if the code doesn't exist at all; authorize()
     * -> 403 if it exists but belongs to a different university. Keeping
     * these as two separate steps (rather than folding the tenant filter
     * into the query) gives an honest 403 instead of a misleading 404 when
     * a technician scans a real code from another institution.
     */
    public function show(string $qrCode): View
    {
        $airConditioner = AirConditioner::where('qr_code', $qrCode)
            ->with([
                'room.building',
                'maintenanceLogs' => fn ($q) => $q->with('technician')->orderByDesc('performed_at'),
            ])
            ->firstOrFail();

        $this->authorize('view', $airConditioner);

        return view('technician.scan', compact('airConditioner'));
    }
}
