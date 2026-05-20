<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $perPage = $validated['per_page'] ?? 20;

        return $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function unreadCount(Request $request)
    {
        return response()->json([
            'count' => $request->user()->notifications()->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, UserNotification $notification)
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        if ($notification->read_at === null) {
            $notification->read_at = now();
            $notification->save();
        }

        return response()->json(['message' => 'Уведомление отмечено прочитанным']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Все уведомления отмечены прочитанными']);
    }

    public function destroySelected(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer'],
        ]);

        $deleted = $request->user()
            ->notifications()
            ->whereIn('id', array_unique($data['ids']))
            ->delete();

        return response()->json([
            'message' => 'Уведомления удалены',
            'deleted' => $deleted,
        ]);
    }
}
