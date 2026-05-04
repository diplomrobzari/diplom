<?php

namespace App\Http\Controllers;

use App\Models\Participation;
use Illuminate\Http\Request;

class ParticipationController extends Controller
{
    /**
     * Удалить участие (мягкое удаление)
     */
    public function destroy($participationId)
    {
        $user = auth('sanctum')->user();

        // Ищем с учётом мягко удалённых
        $participation = Participation::withTrashed()->find($participationId);

        if (!$participation) {
            abort(404, 'Участие не найдено');
        }

        // Проверка прав: только организатор соревнования или сам участник могут удалить
        $isOrganizer = $participation->competition->user_id === $user->id;
        $isParticipant = $participation->user_id === $user->id;

        if (!$isOrganizer && !$isParticipant) {
            abort(403, 'Нет прав для удаления этой записи');
        }

        $participation->delete();

        return response()->json(['message' => 'Участие удалено и перемещено в архив']);
    }

    /**
     * Восстановить участие из архива
     */
    public function restore($participationId)
    {
        $user = auth('sanctum')->user();

        // Ищем с учётом мягко удалённых
        $participation = Participation::withTrashed()->find($participationId);

        if (!$participation) {
            abort(404, 'Участие не найдено');
        }

        // Проверка прав: только организатор или участник могут восстановить
        $isOrganizer = $participation->competition->user_id === $user->id;
        $isParticipant = $participation->user_id === $user->id;

        if (!$isOrganizer && !$isParticipant) {
            abort(403, 'Нет прав для восстановления этой записи');
        }

        $participation->restore();

        return response()->json(['message' => 'Участие восстановлено из архива']);
    }

    /**
     * Получить архивные участия для текущего пользователя
     */
    public function archived(Request $request)
    {
        $user = $request->user();

        $archived = Participation::with(['competition'])
            ->onlyTrashed()
            ->where(function ($query) use ($user) {
                // Участия где пользователь был участником или организатором
                $query->where('user_id', $user->id)
                    ->orWhereHas('competition', function ($q) use ($user) {
                        $q->where('user_id', $user->id);
                    });
            })
            ->orderBy('deleted_at', 'desc')
            ->paginate(20);

        return $archived;
    }
}
