<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Competition extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'category_id',
        'category_name',
        'custom_category',
        'title',
        'description',
        'city',
        'address',
        'latitude',
        'longitude',
        'starts_at',
        'ends_at',
        'max_participants',
        'current_participants',
        'status',
        'is_public',
        'approved_at',
        'moderation_comment',
        'metadata',
        'tag_names',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'approved_at' => 'datetime',
        'is_public' => 'boolean',
        'metadata' => 'array',
        'tag_names' => 'array',
    ];

    protected $dates = ['deleted_at'];

    public const STATUSES = [
        'pending_review',
        'needs_revision',
        'recruiting',
        'upcoming',
        'live',
        'finished',
        'closed', // Набор завершен (все места заняты, до старта больше суток)
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class)->withTimestamps();
    }

    public function participations()
    {
        return $this->hasMany(Participation::class);
    }

    public function organizerReviews()
    {
        return $this->hasMany(OrganizerReview::class);
    }

    public function scopeFilter($query, array $filters)
    {
        return $query
            ->when($filters['search'] ?? null, fn($q, $search) => $q->where('title', 'like', "%{$search}%"))
            ->when($filters['city'] ?? null, fn($q, $city) => $q->where('city', 'like', "%{$city}%"))
            ->when($filters['status'] ?? null, fn($q, $status) => $q->where('status', $status))
            ->when($filters['date_from'] ?? null, fn($q, $date) => $q->whereDate('starts_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn($q, $date) => $q->whereDate('starts_at', '<=', $date))
            ->when($filters['category'] ?? null, function ($q, $category) {
                $q->where(function ($inner) use ($category) {
                    $inner->whereHas('category', fn($sub) => $sub->where('slug', $category))
                        ->orWhere('custom_category', 'like', "%{$category}%");
                });
            })
            ->when($filters['tag'] ?? null, fn($q, $tag) => $q->whereHas('tags', fn($sub) => $sub->where('slug', $tag)))
            ->when($filters['tags'] ?? null, fn($q, $tags) => $q->whereHas('tags', fn($sub) => $sub->whereIn('slug', $tags)));
    }

    public function refreshStatus(): void
    {
        $now = Carbon::now();
        $previousStatus = $this->status;

        if (in_array($this->status, ['pending_review', 'needs_revision'], true)) {
            return;
        }

        // Если мероприятие уже закончилось
        if ($this->ends_at && $now->greaterThanOrEqualTo($this->ends_at)) {
            $this->status = 'finished';
        }
        // Если мероприятие идет сейчас
        elseif ($now->greaterThanOrEqualTo($this->starts_at) && $now->lessThan($this->ends_at ?? $this->starts_at->copy()->addHours(4))) {
            $this->status = 'live';
        }
        // Если до начала осталось меньше дня — статус «скоро состоится»
        elseif ($this->starts_at->isFuture() && $now->greaterThanOrEqualTo($this->starts_at->copy()->subDay())) {
            $this->status = 'upcoming';
        }
        // Если до начала больше дня — «набор участников»; «набор завершен», если мест нет
        elseif ($this->starts_at->isFuture()) {
            $this->status = $this->hasCapacity() ? 'recruiting' : 'closed';
        }

        if ($this->status !== $previousStatus) {
            $this->saveQuietly();
        }
    }

    public function hasCapacity(): bool
    {
        return $this->max_participants === 0 || $this->current_participants < $this->max_participants;
    }
}
