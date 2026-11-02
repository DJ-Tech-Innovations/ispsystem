<?php

namespace App\Models;

use App\Models\Concerns\LogsChanges;
use App\Notifications\QueuedResetPassword;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, HasUuids, LogsChanges, Notifiable;

    protected $guarded = [];

    /** Roles live on one guard, whichever area a request came through. */
    protected string $guard_name = 'web';

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    protected function auditIgnored(): array
    {
        return ['last_login_at'];
    }

    public function auditLabel(): string
    {
        return 'User '.$this->email;
    }

    public function scopeStaff(Builder $query): Builder
    {
        return $query->where('type', 'staff');
    }

    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new QueuedResetPassword($token));
    }

    public function isStaff(): bool
    {
        return $this->type === 'staff';
    }
}
