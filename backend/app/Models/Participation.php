<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Participation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'competition_id',
        'status',
        'place',
        'score',
        'result_note',
    ];

    protected $dates = ['deleted_at'];

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
