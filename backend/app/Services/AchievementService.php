<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class AchievementService
{
    /**
     * Пересчитывает достижения пользователя по участиям и местам.
     */
    public function recalculateForUser(User $user, bool $force = false): void
    {
        $cacheKey = "achievements:recalculated:user:{$user->id}";
        if (! $force && Cache::has($cacheKey)) {
            return;
        }

        $allParticipations = fn () => $user->participations()->withTrashed();

        $participationsCount = $allParticipations()->count();
        $firstPlaces = $allParticipations()->where('status', 'finished')->where('place', 1)->count();
        $secondPlaces = $allParticipations()->where('status', 'finished')->where('place', 2)->count();
        $thirdPlaces = $allParticipations()->where('status', 'finished')->where('place', 3)->count();

        $counts = [
            'participations' => $participationsCount,
            'first_place' => $firstPlaces,
            'second_place' => $secondPlaces,
            'third_place' => $thirdPlaces,
        ];

        $achievements = Achievement::all();

        foreach ($achievements as $achievement) {
            $total = $counts[$achievement->code] ?? 0;
            $threshold = (int) $achievement->threshold;
            $level = $threshold > 0 ? (int) floor($total / $threshold) : 0;
            $progress = $threshold > 0 ? $total % $threshold : 0;

            $user->userAchievements()->updateOrCreate(
                ['achievement_id' => $achievement->id],
                ['level' => $level, 'progress' => $progress]
            );
        }

        Cache::put($cacheKey, true, now()->addMinutes(5));
    }
}
