<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'air_conditioner_id',
        'university_id',
        'status',
        'claimed_by',
        'claimed_at',
    ];

    protected function casts(): array
    {
        return [
            'claimed_at' => 'datetime',
        ];
    }

    public function airConditioner(): BelongsTo
    {
        return $this->belongsTo(AirConditioner::class);
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimed_by');
    }
}
