<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AirConditioner extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'ac_code',
        'qr_code',
        'brand',
        'model',
        'btu',
        'installed_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'installed_at' => 'date',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    /**
     * Format: {university abbreviation}-{building abbreviation}-{room name}-{2-digit sequence in room}
     * e.g. PKRU-B1-101-01. Globally unique by construction: the
     * university/building abbreviations are themselves unique down that
     * chain, so only the per-room sequence needs to be correct.
     *
     * Callers doing this from a concurrent context (e.g. the admin "create"
     * endpoint) MUST wrap this in a transaction with the room row locked
     * (lockForUpdate) first — this method only computes the next number
     * from what's currently in the table, it does not itself guard against
     * two callers reading the same count at once.
     */
    public static function generateCodeForRoom(Room $room): string
    {
        $building = $room->building;
        $university = $building->university;

        $sequence = static::where('room_id', $room->id)->count() + 1;

        return sprintf(
            '%s-%s-%s-%02d',
            strtoupper($university->abbreviation),
            strtoupper($building->abbreviation),
            $room->name,
            $sequence
        );
    }
}
