<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Competition;
use App\Models\OrganizerReview;
use App\Models\Participation;
use App\Models\Tag;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class CompetitionController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(Competition::STATUSES)],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'category' => ['nullable', 'string', 'max:255'],
            'tag' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:15'],
        ]);

        $rawTags = $request->query('tags');
        $tags = null;
        if (is_string($rawTags) && $rawTags !== '') {
            $tags = array_values(array_filter(array_map('trim', explode(',', $rawTags))));
        } elseif (is_array($rawTags)) {
            $tags = array_values(array_filter(array_map(
                static fn ($tag) => is_string($tag) ? trim($tag) : '',
                $rawTags
            )));
        }

        $filters = [
            'search' => $validated['search'] ?? null,
            'city' => $validated['city'] ?? null,
            'status' => $validated['status'] ?? null,
            'date_from' => $validated['date_from'] ?? null,
            'date_to' => $validated['date_to'] ?? null,
            'category' => $validated['category'] ?? null,
            'tag' => $validated['tag'] ?? null,
            'tags' => !empty($tags) ? $tags : null,
        ];

        $sort = $validated['sort'] ?? 'newest';
        $orderDirection = $sort === 'oldest' ? 'asc' : 'desc';

        $perPage = $validated['per_page'] ?? 15;
        $competitions = Competition::with(['category', 'tags', 'creator'])
            ->filter($filters)
            ->whereNotIn('status', ['pending_review', 'needs_revision'])
            ->orderBy('created_at', $orderDirection)
            ->paginate($perPage);

        // Обновляем статусы для всех объявлений
        foreach ($competitions->items() as $competition) {
            $competition->refreshStatus();
        }

        return $competitions;
    }

    public function show(Request $request, Competition $competition)
    {
        // Обновляем статус перед возвратом
        $competition->refreshStatus();

        // Если объявление на проверке, проверяем права доступа
        if (in_array($competition->status, ['pending_review', 'needs_revision'], true)) {
            // Маршрут может быть вызван без middleware, поэтому проверяем через guard
            $user = auth('sanctum')->user();
            // Разрешаем доступ только админам или создателю объявления
            if (!$user || ($user->id !== $competition->user_id && !$user->isAdmin())) {
                abort(404, 'Объявление не найдено');
            }
        }

        $competition->load(['category', 'tags', 'creator', 'participations' => function ($query) {
            $query->with('user')->withTrashed();
        }]);

        return $competition;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'city' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'max_participants' => ['required', 'integer', 'min:1', 'max:100'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'category_name' => ['nullable', 'string', 'max:255'],
            'custom_category' => ['nullable', 'string', 'max:255'],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
            'tag_names' => ['nullable', 'array'],
            'tag_names.*' => ['string', 'max:50'],
        ]);

        try {
            $competition = DB::transaction(function () use ($data, $request) {
                $competition = Competition::create([
                    'user_id' => $request->user()->id,
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'city' => $data['city'],
                    'address' => $data['address'] ?? null,
                    'latitude' => $data['latitude'] ?? null,
                    'longitude' => $data['longitude'] ?? null,
                    'starts_at' => new Carbon($data['starts_at']),
                    'ends_at' => isset($data['ends_at']) ? new Carbon($data['ends_at']) : null,
                    'max_participants' => $data['max_participants'],
                    'category_id' => $data['category_id'] ?? null,
                    'category_name' => $data['category_name'] ?? null,
                    'custom_category' => $data['custom_category'] ?? null,
                    'tag_names' => $data['tag_names'] ?? $data['tags'] ?? [],
                    'status' => 'pending_review',
                ]);

                $tagIds = $this->syncTags($data['tags'] ?? $data['tag_names'] ?? []);
                $competition->tags()->sync($tagIds);

                return $competition->fresh(['tags', 'category']);
            });
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Не удалось создать объявление. Проверьте данные и попробуйте снова.',
                'debug' => config('app.debug') ? $exception->getMessage() : null,
            ], 500);
        }

        try {
            app(NotificationService::class)->sendToAdmins(
            'competition_submitted',
            'Новое объявление на модерации',
            "Организатор отправил объявление «{$competition->title}» на модерацию.",
            [
                'competition_id' => $competition->id,
                'competition_status' => $competition->status,
            ]
            );
        } catch (Throwable $exception) {
            report($exception);
        }

        return response()->json($competition->fresh(['tags', 'category']), 201);
    }

    public function update(Request $request, Competition $competition)
    {
        $this->authorizeOwnerOrAdmin($request->user(), $competition);

        // Определяем, может ли пользователь редактировать
        $isAdmin = $request->user()->isAdmin();
        $isOwner = $competition->user_id === $request->user()->id;

        // Создатель может редактировать только если объявление не в статусе "В процессе" или "Завершено"
        if ($isOwner && !$isAdmin && in_array($competition->status, ['live', 'finished'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Нельзя редактировать объявление, которое находится в статусе «В процессе» или «Завершено».'],
            ]);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'city' => ['sometimes', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'max_participants' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'category_name' => ['nullable', 'string', 'max:255'],
            'custom_category' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(Competition::STATUSES)],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
            'tag_names' => ['nullable', 'array'],
            'tag_names.*' => ['string', 'max:50'],
        ]);

        if ($isOwner) {
            unset($data['status']);
        }

        $publishedStatuses = ['recruiting', 'upcoming', 'closed'];
        $needsRemoderation = $isOwner && in_array($competition->status, $publishedStatuses, true);
        $wasPublishedBeforeEdit = $needsRemoderation;
        $currentParticipants = $competition->current_participants;

        // Сохраняем старые значения для уведомления
        $changes = [];
        if (isset($data['title']) && $data['title'] !== $competition->title) {
            $changes[] = 'Название';
        }
        if (isset($data['description']) && $data['description'] !== $competition->description) {
            $changes[] = 'Описание';
        }
        if (isset($data['city']) && $data['city'] !== $competition->city) {
            $changes[] = 'Город';
        }
        if (isset($data['address']) && $data['address'] !== $competition->address) {
            $changes[] = 'Адрес';
        }
        if (isset($data['starts_at']) && $data['starts_at'] !== $competition->starts_at?->toIso8601String()) {
            $changes[] = 'Дата начала';
        }
        if (isset($data['ends_at']) && $data['ends_at'] !== $competition->ends_at?->toIso8601String()) {
            $changes[] = 'Дата окончания';
        }
        if (isset($data['max_participants']) && $data['max_participants'] !== $competition->max_participants) {
            $changes[] = 'Количество мест';
        }

        $competition->fill($data);
        $competition->current_participants = $currentParticipants;
        
        // Сохраняем названия тегов при обновлении
        if (isset($data['tag_names'])) {
            $competition->tag_names = $data['tag_names'];
        } elseif (isset($data['tags'])) {
            $competition->tag_names = $data['tags'];
        }

        if ($needsRemoderation) {
            $competition->status = 'pending_review';
            $competition->approved_at = null;
        }
        
        $competition->save();

        if (isset($data['tags']) || isset($data['tag_names'])) {
            $tagIds = $this->syncTags($data['tags'] ?? $data['tag_names'] ?? []);
            $competition->tags()->sync($tagIds);
        }

        if ($needsRemoderation) {
            app(NotificationService::class)->sendToAdmins(
                'competition_resubmitted',
                'Объявление отправлено на повторную модерацию',
                $wasPublishedBeforeEdit
                    ? "Организатор изменил опубликованное объявление «{$competition->title}» и отправил его на повторную модерацию."
                    : "Организатор обновил объявление «{$competition->title}» и отправил его на модерацию.",
                [
                    'competition_id' => $competition->id,
                    'competition_status' => $competition->status,
                    'moderation_comment' => $competition->moderation_comment,
                ]
            );
        }

        if (! in_array($competition->status, ['pending_review', 'needs_revision'], true)) {
            $competition->refreshStatus();
        }

        // Отправляем уведомления участникам об изменении
        if (!empty($changes)) {
            $notificationService = app(NotificationService::class);
            $changesText = "- " . implode("\n- ", $changes);

            $competition->participations()
                ->with('user')
                ->whereIn('status', ['registered', 'finished', 'no_show', 'disqualified'])
                ->chunkById(100, function ($participants) use ($competition, $changesText, $notificationService) {
                    foreach ($participants as $participation) {
                        if (! $participation->user) {
                            continue;
                        }

                        $notificationService->sendToUser(
                            $participation->user,
                            'competition_updated',
                            'Объявление изменено',
                            "В объявлении «{$competition->title}» были внесены изменения:\n{$changesText}\n\nПроверьте актуальную информацию в объявлении.",
                            [
                                'competition_id' => $competition->id,
                                'competition_status' => $competition->status,
                            ]
                        );
                    }
                });
        }

        return $competition->fresh(['tags', 'category']);
    }

    public function approve(Request $request, Competition $competition)
    {
        $this->ensureAdmin($request->user());

        if ($competition->status !== 'pending_review') {
            throw ValidationException::withMessages([
                'status' => ['Одобрение доступно только после отправки объявления на модерацию.'],
            ]);
        }

        $competition->update([
            'status' => 'recruiting',
            'approved_at' => now(),
            'moderation_comment' => null,
        ]);

        return response()->json(['message' => 'Объявление одобрено', 'competition' => $competition]);
    }

    public function requestRevision(Request $request, Competition $competition)
    {
        $this->ensureAdmin($request->user());

        if ($competition->status !== 'pending_review') {
            throw ValidationException::withMessages([
                'status' => ['Отправить на доработку можно только объявление, которое ожидает модерации.'],
            ]);
        }

        $data = $request->validate([
            'comment' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $competition->update([
            'status' => 'needs_revision',
            'moderation_comment' => trim($data['comment']),
            'approved_at' => null,
        ]);

        app(NotificationService::class)->sendToUser(
            $competition->creator,
            'competition_revision_requested',
            'Объявление отправлено на доработку',
            "Администратор попросил доработать объявление «{$competition->title}».\n\nКомментарий: {$competition->moderation_comment}",
            [
                'competition_id' => $competition->id,
                'competition_status' => $competition->status,
                'moderation_comment' => $competition->moderation_comment,
            ]
        );

        return response()->json([
            'message' => 'Объявление отправлено на доработку',
            'competition' => $competition,
        ]);
    }

    public function submitForReview(Request $request, Competition $competition)
    {
        $user = $request->user();

        if (!$user || ($user->id !== $competition->user_id && !$user->isAdmin())) {
            abort(403, 'Недостаточно прав');
        }

        if ($competition->status !== 'needs_revision') {
            throw ValidationException::withMessages([
                'status' => ['Повторно отправить на модерацию можно только объявление со статусом «На доработке».'],
            ]);
        }

        $competition->update([
            'status' => 'pending_review',
            'approved_at' => null,
        ]);

        app(NotificationService::class)->sendToAdmins(
            'competition_resubmitted',
            'Объявление повторно отправлено на модерацию',
            "Организатор повторно отправил объявление «{$competition->title}» на модерацию.",
            [
                'competition_id' => $competition->id,
                'competition_status' => $competition->status,
                'moderation_comment' => $competition->moderation_comment,
            ]
        );

        return response()->json([
            'message' => 'Объявление повторно отправлено на модерацию',
            'competition' => $competition,
        ]);
    }

    public function register(Request $request, Competition $competition)
    {
        $competition->refreshStatus();

        // Проверяем, не закончилось ли мероприятие
        $now = Carbon::now();
        if ($competition->status === 'finished' || 
            ($competition->ends_at && $now->greaterThanOrEqualTo($competition->ends_at))) {
            throw ValidationException::withMessages(['competition' => 'Соревнование уже завершено.']);
        }

        if (! $competition->hasCapacity()) {
            throw ValidationException::withMessages(['competition' => 'Свободных мест нет.']);
        }

        $participation = Participation::firstOrCreate(
            ['user_id' => $request->user()->id, 'competition_id' => $competition->id],
            ['status' => 'registered']
        );

        if ($participation->wasRecentlyCreated || $participation->status === 'withdrawn') {
            $competition->increment('current_participants');
            $participation->update(['status' => 'registered']);

            $participant = $request->user();
            $notificationService = app(NotificationService::class);

            $notificationService->sendToUser(
                $participant,
                'competition_registration_confirmed',
                'Вы записаны на соревнование',
                "Вы успешно записались на соревнование «{$competition->title}».",
                [
                    'competition_id' => $competition->id,
                    'competition_status' => $competition->status,
                ]
            );

            if ($competition->user_id !== $participant->id) {
                $participantName = $participant->name ?: '@' . $participant->username;

                $notificationService->sendToUser(
                    $competition->creator,
                    'competition_registration',
                    'Новая запись на объявление',
                    "{$participantName} записался на объявление «{$competition->title}».",
                    [
                        'competition_id' => $competition->id,
                        'competition_status' => $competition->status,
                        'participant_id' => $participant->id,
                    ]
                );
            }
        }

        app(AchievementService::class)->recalculateForUser($request->user(), true);

        return response()->json(['message' => 'Вы записаны', 'participation' => $participation]);
    }

    public function unregister(Request $request, Competition $competition)
    {
        // Проверяем, не закончилось ли мероприятие
        $now = Carbon::now();
        if ($competition->status === 'finished' || 
            ($competition->ends_at && $now->greaterThanOrEqualTo($competition->ends_at))) {
            throw ValidationException::withMessages(['competition' => 'Нельзя отписаться от завершенного мероприятия.']);
        }

        $participation = Participation::where('competition_id', $competition->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $participation) {
            return response()->json(['message' => 'Вы не записаны'], 200);
        }

        $participation->update(['status' => 'withdrawn']);
        if ($competition->current_participants > 0) {
            $competition->decrement('current_participants');
        }

        app(AchievementService::class)->recalculateForUser($request->user(), true);

        return response()->json(['message' => 'Вы отписались']);
    }

    public function removeParticipant(Request $request, Competition $competition, $userId)
    {
        // Проверяем, что пользователь является создателем объявления или админом
        $this->authorizeOwner($request->user(), $competition);

        $participation = Participation::where('competition_id', $competition->id)
            ->where('user_id', $userId)
            ->first();

        if (! $participation) {
            return response()->json(['message' => 'Участник не найден'], 404);
        }

        $participation->update(['status' => 'withdrawn']);
        if ($competition->current_participants > 0) {
            $competition->decrement('current_participants');
        }

        return response()->json(['message' => 'Участник удален из объявления']);
    }

    public function markNoShow(Request $request, Competition $competition, $userId)
    {
        // Проверяем, что пользователь является создателем объявления или админом
        $this->authorizeOwner($request->user(), $competition);

        $competition->refreshStatus();
        if (! in_array($competition->status, ['live', 'finished'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Статус «Не явился» можно ставить только когда объявление в статусе «В процессе» или «Завершено».'],
            ]);
        }

        $participation = Participation::where('competition_id', $competition->id)
            ->where('user_id', $userId)
            ->first();

        if (! $participation) {
            return response()->json(['message' => 'Участник не найден'], 404);
        }

        $participation->update([
            'status' => 'no_show',
            'place' => null,
            'score' => null,
        ]);

        return response()->json(['message' => 'Участник отмечен как не явившийся']);
    }

    public function participants(Request $request, Competition $competition)
    {
        // Если запрос от создателя или админа, возвращаем всех участников
        $user = auth('sanctum')->user();
        $isOwnerOrAdmin = $user && ($user->id === $competition->user_id || $user->isAdmin());
        
        if ($isOwnerOrAdmin) {
            // Отписавшиеся (withdrawn) не показываем — только текущие участники и с результатами
            return $competition->participations()
                ->whereIn('status', ['registered', 'finished', 'no_show', 'disqualified'])
                ->with('user')
                ->orderByRaw("CASE status WHEN 'registered' THEN 1 WHEN 'finished' THEN 2 WHEN 'no_show' THEN 3 WHEN 'disqualified' THEN 4 END")
                ->orderBy('place')
                ->get();
        }

        // Для остальных возвращаем только активных участников
        return $competition->participations()
            ->where('status', 'registered')
            ->with('user')
            ->get();
    }

    public function pending(Request $request)
    {
        $this->ensureAdmin($request->user());

        $competitions = Competition::with(['category', 'tags', 'creator'])
            ->whereIn('status', ['pending_review', 'needs_revision'])
            ->orderByRaw("CASE status WHEN 'pending_review' THEN 1 WHEN 'needs_revision' THEN 2 END")
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($competitions);
    }

    public function destroy(Request $request, $competitionId)
    {
        $user = $request->user();

        // Ищем с учётом мягко удалённых
        $competition = Competition::withTrashed()->find($competitionId);

        if (!$competition) {
            abort(404, 'Объявление не найдено');
        }

        // Админ может удалять всегда (мягкое удаление)
        if ($user->isAdmin()) {
            // Отправляем уведомления всем участникам
            $notificationService = app(NotificationService::class);
            $competition->participations()
                ->with('user')
                ->whereIn('status', ['registered', 'finished', 'no_show', 'disqualified'])
                ->chunkById(100, function ($participants) use ($competition, $notificationService) {
                    foreach ($participants as $participation) {
                        if (! $participation->user) {
                            continue;
                        }

                        $notificationService->sendToUser(
                            $participation->user,
                            'competition_deleted_by_admin',
                            'Объявление удалено',
                            "Объявление «{$competition->title}» было удалено администратором.\n\nК сожалению, соревнование отменено.",
                            [
                                'competition_id' => $competition->id,
                                'competition_status' => $competition->status,
                            ]
                        );
                    }
                });

            $competition->delete(); // мягкое удаление
            return response()->json(['message' => 'Объявление перемещено в архив']);
        }

        // Создатель может удалять только если объявление не в статусе "В процессе" или "Завершено"
        if ($competition->user_id === $user->id) {
            if (in_array($competition->status, ['live', 'finished'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Нельзя удалить объявление, которое находится в статусе «В процессе» или «Завершено».'],
                ]);
            }

            // Отправляем уведомления всем участникам
            $notificationService = app(NotificationService::class);
            $competition->participations()
                ->with('user')
                ->whereIn('status', ['registered', 'finished', 'no_show', 'disqualified'])
                ->chunkById(100, function ($participants) use ($competition, $notificationService) {
                    foreach ($participants as $participation) {
                        if (! $participation->user) {
                            continue;
                        }

                        $notificationService->sendToUser(
                            $participation->user,
                            'competition_deleted_by_organizer',
                            'Объявление удалено организатором',
                            "Объявление «{$competition->title}» было удалено организатором.\n\nК сожалению, соревнование отменено.",
                            [
                                'competition_id' => $competition->id,
                                'competition_status' => $competition->status,
                            ]
                        );
                    }
                });

            $competition->delete(); // мягкое удаление
            return response()->json(['message' => 'Объявление перемещено в архив']);
        }

        // Остальные не могут удалять
        abort(403, 'Недостаточно прав');
    }

    /**
     * Восстановить объявление из архива
     */
    public function restore($competitionId)
    {
        $user = auth('sanctum')->user();

        // Ищем с учётом мягко удалённых
        $competition = Competition::withTrashed()->find($competitionId);

        if (!$competition) {
            abort(404, 'Объявление не найдено');
        }

        // Только админ или создатель могут восстановить
        $isAdmin = $user->isAdmin();
        $isOwner = $competition->user_id === $user->id;

        if (!$isAdmin && !$isOwner) {
            abort(403, 'Недостаточно прав для восстановления');
        }

        $competition->restore();

        return response()->json(['message' => 'Объявление восстановлено из архива']);
    }

    /**
     * Получить архивные объявления для текущего пользователя
     */
    public function archived(Request $request)
    {
        $user = $request->user();

        $archived = Competition::with(['category', 'tags', 'creator'])
            ->onlyTrashed()
            ->where('user_id', $user->id)
            ->orderBy('deleted_at', 'desc')
            ->paginate(20);

        return $archived;
    }

    public function results(Request $request, Competition $competition)
    {
        $this->authorizeOwner($request->user(), $competition);

        $competition->refreshStatus();
        if (! in_array($competition->status, ['live', 'finished'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Результаты и отметку «Не явился» можно вносить только когда объявление в статусе «В процессе» или «Завершено».'],
            ]);
        }

        $data = $request->validate([
            'results' => ['required', 'array'],
            'results.*.user_id' => ['required', 'exists:users,id'],
            'results.*.score' => ['nullable', 'numeric'],
            'results.*.result_note' => ['nullable', 'string', 'max:500'],
            'results.*.no_show' => ['nullable', 'boolean'],
            'results.*.disqualified' => ['nullable', 'boolean'],
        ]);

        // Собираем результаты с баллами для автоматического распределения мест
        $resultsWithScores = [];
        $noShowUsers = [];

        foreach ($data['results'] as $row) {
            if (isset($row['no_show']) && $row['no_show']) {
                $noShowUsers[] = $row['user_id'];
                Participation::updateOrCreate(
                    ['user_id' => $row['user_id'], 'competition_id' => $competition->id],
                    [
                        'status' => 'no_show',
                        'place' => null,
                        'score' => null,
                        'result_note' => $row['result_note'] ?? null,
                    ]
                );
            } elseif (isset($row['disqualified']) && $row['disqualified']) {
                $noShowUsers[] = $row['user_id'];
                Participation::updateOrCreate(
                    ['user_id' => $row['user_id'], 'competition_id' => $competition->id],
                    [
                        'status' => 'disqualified',
                        'place' => null,
                        'score' => null,
                        'result_note' => $row['result_note'] ?? null,
                    ]
                );
            } else {
                $score = isset($row['score']) ? (float)$row['score'] : null;
                $resultsWithScores[] = [
                    'user_id' => $row['user_id'],
                    'score' => $score,
                    'result_note' => $row['result_note'] ?? null,
                ];
            }
        }

        // Автоматическое распределение мест по баллам (больше баллов = лучше место)
        if (!empty($resultsWithScores)) {
            // Сортируем по баллам (по убыванию), затем по user_id для стабильности
            usort($resultsWithScores, function ($a, $b) {
                $scoreA = $a['score'] ?? -1;
                $scoreB = $b['score'] ?? -1;
                if ($scoreA === $scoreB) {
                    return $a['user_id'] <=> $b['user_id'];
                }
                return $scoreB <=> $scoreA; // По убыванию
            });

            $place = 1;
            foreach ($resultsWithScores as $index => $result) {
                // Если баллы одинаковые с предыдущим, то место тоже одинаковое
                if ($index > 0 && isset($resultsWithScores[$index - 1]['score']) &&
                    $result['score'] === $resultsWithScores[$index - 1]['score']) {
                    // Место остается прежним
                } else {
                    $place = $index + 1;
                }

                Participation::updateOrCreate(
                    ['user_id' => $result['user_id'], 'competition_id' => $competition->id],
                    [
                        'status' => 'finished',
                        'place' => $place,
                        'score' => $result['score'],
                        'result_note' => $result['result_note'] ?? null,
                    ]
                );
            }
        }

        $competition->update(['status' => 'finished', 'ends_at' => $competition->ends_at ?? now()]);

        $affectedUserIds = array_unique(array_merge(
            $noShowUsers,
            array_column($resultsWithScores, 'user_id')
        ));
        $achievementService = app(AchievementService::class);
        foreach ($affectedUserIds as $uid) {
            $u = User::find($uid);
            if ($u) {
                $achievementService->recalculateForUser($u, true);
            }
        }

        return response()->json(['message' => 'Результаты сохранены']);
    }

    public function finish(Request $request, Competition $competition)
    {
        $this->authorizeOwnerOrAdmin($request->user(), $competition);

        $competition->refreshStatus();
        
        // Можно завершить только если объявление в статусе "В процессе" или "Набор завершен"
        if (! in_array($competition->status, ['recruiting', 'closed', 'live'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Завершить можно только объявление в статусе «В процессе» или «Набор завершен».'],
            ]);
        }

        // Завершаем объявление
        $competition->update([
            'status' => 'finished',
            'ends_at' => $competition->ends_at ?? now(),
        ]);

        // Переводим всех зарегистрированных участников в статус "finished" без места
        $competition->participations()
            ->where('status', 'registered')
            ->update([
                'status' => 'finished',
                'place' => null,
                'score' => null,
            ]);

        return response()->json(['message' => 'Объявление завершено', 'competition' => $competition]);
    }

    public function storeReview(Request $request, Competition $competition)
    {
        $user = $request->user();
        $competition->load('creator');
        $competition->refreshStatus();

        if ($competition->status !== 'finished') {
            throw ValidationException::withMessages([
                'status' => ['Оставить отзыв можно только после завершения соревнования.'],
            ]);
        }

        if ((int) $competition->user_id === (int) $user->id) {
            throw ValidationException::withMessages([
                'review' => ['Нельзя оставить отзыв самому себе.'],
            ]);
        }

        $participation = Participation::query()
            ->where('competition_id', $competition->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['registered', 'finished', 'no_show', 'disqualified'])
            ->first();

        if (! $participation) {
            throw ValidationException::withMessages([
                'review' => ['Оставить отзыв может только участник этого соревнования.'],
            ]);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $existingReview = OrganizerReview::query()
            ->where('competition_id', $competition->id)
            ->where('reviewer_id', $user->id)
            ->first();

        $review = OrganizerReview::updateOrCreate(
            [
                'competition_id' => $competition->id,
                'reviewer_id' => $user->id,
            ],
            [
                'organizer_id' => $competition->user_id,
                'rating' => $data['rating'],
                'comment' => isset($data['comment']) ? trim((string) $data['comment']) : null,
            ]
        );

        if ($competition->creator) {
            app(NotificationService::class)->sendToUser(
                $competition->creator,
                'organizer_review_received',
                $existingReview ? 'Отзыв обновлён' : 'Новый отзыв от участника',
                $existingReview
                    ? "Пользователь {$user->name} обновил отзыв к соревнованию «{$competition->title}»."
                    : "Пользователь {$user->name} оставил отзыв к соревнованию «{$competition->title}».",
                [
                    'competition_id' => $competition->id,
                    'review_id' => $review->id,
                    'rating' => $review->rating,
                ]
            );
        }

        return response()->json([
            'message' => $existingReview ? 'Отзыв обновлён' : 'Отзыв сохранён',
            'review' => $review->load(['competition', 'reviewer']),
        ]);
    }

    private function syncTags(array $tags): array
    {
        $tagIds = [];
        foreach ($tags as $tagName) {
            if (! is_string($tagName)) {
                continue;
            }

            $tagName = trim($tagName);
            if ($tagName === '') {
                continue;
            }

            $slug = Str::slug($tagName);
            $tag = Tag::query()
                ->where('slug', $tagName)
                ->orWhere('name', $tagName)
                ->when($slug !== '', fn ($query) => $query->orWhere('slug', $slug))
                ->first();

            if (! $tag) {
                $tag = Tag::create([
                    'name' => $tagName,
                    'slug' => $slug !== '' ? $slug : $this->uniqueFallbackTagSlug($tagName),
                ]);
            }

            $tagIds[] = $tag->id;
        }

        return array_values(array_unique($tagIds));
    }

    private function uniqueFallbackTagSlug(string $tagName): string
    {
        $base = 'tag-' . substr(sha1($tagName), 0, 12);
        $slug = $base;
        $counter = 2;

        while (Tag::query()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    private function authorizeOwnerOrAdmin($user, Competition $competition): void
    {
        if ($user->id !== $competition->user_id && ! $user->isAdmin()) {
            abort(403, 'Недостаточно прав');
        }
    }

    private function authorizeOwner($user, Competition $competition): void
    {
        if ($user->id !== $competition->user_id) {
            abort(403, 'Р’РЅРѕСЃС‚Рё СЂРµР·СѓР»СЊС‚Р°С‚С‹ РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ РѕСЂРіР°РЅРёР·Р°С‚РѕСЂ СЌС‚РѕРіРѕ СЃРѕСЂРµРІРЅРѕРІР°РЅРёСЏ');
        }
    }

    private function ensureAdmin($user): void
    {
        if (! $user->isAdmin()) {
            abort(403, 'Доступ только для администратора');
        }
    }
}
