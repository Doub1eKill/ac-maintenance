<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class University extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'abbreviation',
        'address',
        'phone',
    ];

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }
}
