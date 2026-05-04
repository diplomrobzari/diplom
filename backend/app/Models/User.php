<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'surname',
        'patronymic',
        'birth_date',
        'username',
        'email',
        'password',
        'city',
        'bio',
        'is_admin',
        'is_banned',
        'avatar_url',
        'avatar_frame_key',
        'profile_background_key',
        'two_factor_enabled',
        'two_factor_code',
        'two_factor_code_sent_at',
        'failed_login_attempts',
        'locked_until',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_code',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_admin' => 'boolean',
        'is_banned' => 'boolean',
        'birth_date' => 'date',
        'two_factor_enabled' => 'boolean',
        'two_factor_code_sent_at' => 'datetime',
        'failed_login_attempts' => 'integer',
        'locked_until' => 'datetime',
    ];

    public function competitions()
    {
        return $this->hasMany(Competition::class);
    }

    public function participations()
    {
        return $this->hasMany(Participation::class);
    }

    public function userAchievements()
    {
        return $this->hasMany(UserAchievement::class);
    }

    public function achievements()
    {
        return $this->belongsToMany(Achievement::class, 'user_achievements')
            ->withPivot('level', 'progress')
            ->withTimestamps();
    }

    public function notifications()
    {
        return $this->hasMany(UserNotification::class)->orderByDesc('created_at');
    }

    public function reviewsReceived()
    {
        return $this->hasMany(OrganizerReview::class, 'organizer_id');
    }

    public function reviewsAuthored()
    {
        return $this->hasMany(OrganizerReview::class, 'reviewer_id');
    }

    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function getLockRemainingTime(): ?\DateInterval
    {
        if (!$this->isLocked()) {
            return null;
        }
        return now()->diff($this->locked_until);
    }

    public function incrementLoginAttempts(): int
    {
        $this->increment('failed_login_attempts');
        return $this->failed_login_attempts;
    }

    public function resetLoginAttempts(): void
    {
        $this->failed_login_attempts = 0;
        $this->locked_until = null;
        $this->save();
    }

    public function lockAccount(int $minutes = 10): void
    {
        $this->locked_until = now()->addMinutes($minutes);
        $this->save();
    }
}
