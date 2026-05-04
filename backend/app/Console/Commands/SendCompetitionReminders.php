<?php

namespace App\Console\Commands;

use App\Models\Competition;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class SendCompetitionReminders extends Command
{
    protected $signature = 'competitions:send-reminders';

    protected $description = 'Send lightweight competition start reminders to participants and organizers';

    private const REMINDERS = [
        '3_days' => ['hours' => 72, 'label' => 'через 3 дня'],
        '1_day' => ['hours' => 24, 'label' => 'через 1 день'],
        '3_hours' => ['hours' => 3, 'label' => 'через 3 часа'],
    ];

    public function handle(NotificationService $notificationService): int
    {
        $now = Carbon::now();
        $sent = 0;

        Competition::query()
            ->whereNull('deleted_at')
            ->whereNotIn('status', ['pending_review', 'needs_revision', 'finished'])
            ->where('starts_at', '>', $now)
            ->where('starts_at', '<=', $now->copy()->addDays(3))
            ->with(['creator:id,name,email', 'participations.user:id,name,email'])
            ->orderBy('starts_at')
            ->chunkById(50, function ($competitions) use ($now, $notificationService, &$sent) {
                foreach ($competitions as $competition) {
                    foreach (self::REMINDERS as $key => $config) {
                        $dueAt = $competition->starts_at->copy()->subHours($config['hours']);
                        if ($dueAt->greaterThan($now) || $dueAt->lessThan($now->copy()->subMinutes(70))) {
                            continue;
                        }

                        foreach ($this->reminderRecipients($competition) as $user) {
                            if (! $this->markReminderAsQueued($competition->id, $user->id, $key)) {
                                continue;
                            }

                            $notificationService->sendToUser(
                                $user,
                                "competition_reminder_{$key}",
                                'Скоро начнётся соревнование',
                                "Напоминание: соревнование «{$competition->title}» начнётся {$config['label']} ({$competition->starts_at->format('d.m.Y H:i')}).",
                                [
                                    'competition_id' => $competition->id,
                                    'competition_status' => $competition->status,
                                    'starts_at' => $competition->starts_at->toDateTimeString(),
                                    'reminder_key' => $key,
                                ]
                            );
                            $sent++;
                        }
                    }
                }
            });

        $this->info("Competition reminders sent: {$sent}");

        return self::SUCCESS;
    }

    /**
     * @return array<int, User>
     */
    private function reminderRecipients(Competition $competition): array
    {
        $users = [];

        if ($competition->creator) {
            $users[$competition->creator->id] = $competition->creator;
        }

        foreach ($competition->participations as $participation) {
            if (! in_array($participation->status, ['registered', 'finished'], true)) {
                continue;
            }

            if ($participation->user) {
                $users[$participation->user->id] = $participation->user;
            }
        }

        return array_values($users);
    }

    private function markReminderAsQueued(int $competitionId, int $userId, string $key): bool
    {
        try {
            DB::table('competition_reminders')->insert([
                'competition_id' => $competitionId,
                'user_id' => $userId,
                'reminder_key' => $key,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return true;
        } catch (QueryException) {
            return false;
        }
    }
}
