<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProfileCustomization extends Model
{
    protected $fillable = [
        'type',
        'name',
        'required_tasks',
        'file_path',
    ];
}
