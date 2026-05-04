<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrganizerReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'competition_id',
        'organizer_id',
        'reviewer_id',
        'rating',
        'comment',
        'organizer_reply',
        'organizer_replied_at',
    ];

    protected $casts = [
        'organizer_replied_at' => 'datetime',
    ];

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function organizer()
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
