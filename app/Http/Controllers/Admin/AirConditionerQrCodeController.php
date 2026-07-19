<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AirConditioner;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Response;

class AirConditionerQrCodeController extends Controller
{
    /**
     * Renders a PNG QR code. The data encoded is the full URL to the
     * technician scan page (tech.scan.show), not the bare qr_code uuid —
     * that way any phone's stock camera app opens the unit's page directly
     * on scan, with no dedicated in-app scanner needed. The uuid is still
     * what identifies the unit (never ac_code, which is human-facing and
     * shouldn't be guessable/enumerable); it's just carried inside the URL
     * rather than printed as raw data.
     *
     * Same endpoint serves both the single "view/download" button on the
     * edit page and the print-sheet layout (one <img> tag per unit,
     * pointing at this same route) — no separate bulk endpoint needed since
     * each <img> request is independent and cheap to generate on the fly.
     */
    public function show(AirConditioner $airConditioner): Response
    {
        $this->authorize('view', $airConditioner);

        $result = (new Builder())->build(
            writer: new PngWriter(),
            data: route('tech.scan.show', $airConditioner->qr_code),
            size: 300,
            margin: 10,
        );

        return response($result->getString(), 200)
            ->header('Content-Type', $result->getMimeType());
    }
}
