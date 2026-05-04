<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Mail;
use Throwable;

class NotificationService
{
    private const EMAIL_DUPLICATED_TYPES = [
        'competition_registration',
        'competition_registration_confirmed',
        'competition_updated',
        'competition_deleted_by_admin',
        'competition_deleted_by_organizer',
        'organizer_review_received',
        'review_reply_received',
    ];

    public function sendToUser(User $user, string $type, string $title, string $message, array $data = []): UserNotification
    {
        $notification = UserNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data ?: null,
        ]);

        $email = $user->email;
        if (!empty($email) && $this->shouldDuplicateToEmail($type)) {
            app()->terminating(function () use ($email, $title, $message) {
                try {
                    Mail::raw($message, function ($mail) use ($email, $title) {
                        $mail->to($email)->subject($title);
                    });
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
        }

        return $notification;
    }

    private function shouldDuplicateToEmail(string $type): bool
    {
        return in_array($type, self::EMAIL_DUPLICATED_TYPES, true)
            || str_starts_with($type, 'competition_reminder_');
    }

    public function sendToAdmins(string $type, string $title, string $message, array $data = []): void
    {
        User::query()
            ->select(['id', 'email'])
            ->where('is_admin', true)
            ->get()
            ->each(function (User $admin) use ($type, $title, $message, $data) {
                $this->sendToUser($admin, $type, $title, $message, $data);
            });
    }
}
