<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'university_id',
        'role',
        'status',
        'name',
        'email',
        'password',
    ];

    /**
     * Whether this account is allowed to log in and act right now.
     * Separate from role — an account can be a valid technician and
     * still be pending/suspended.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Small readability helpers so role checks read as intent
     * (`$user->isSuperAdmin()`) instead of repeating the raw string
     * comparison in every controller/view that needs one.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isOrgAdmin(): bool
    {
        return $this->role === 'org_admin';
    }

    public function isTechnician(): bool
    {
        return $this->role === 'technician';
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function phones(): HasMany
    {
        return $this->hasMany(UserPhone::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class);
    }

    /**
     * Work orders this technician currently holds/has held — named
     * "claimed" (not just workOrders()) since the FK is claimed_by, a
     * pool-claim relationship, not "assigned to" in the traditional sense.
     */
    public function claimedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'claimed_by');
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
