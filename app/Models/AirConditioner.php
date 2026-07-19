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
}
