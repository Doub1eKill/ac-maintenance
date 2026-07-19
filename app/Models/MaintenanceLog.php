<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'air_conditioner_id',
        'work_order_id',
        'user_id',
        'action',
        'notes',
        'performed_at',
    ];

    protected function casts(): array
    {
        return [
            'performed_at' => 'datetime',
        ];
    }

    public function airConditioner(): BelongsTo
    {
        return $this->belongsTo(AirConditioner::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
