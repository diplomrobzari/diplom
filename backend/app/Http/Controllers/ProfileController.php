<?php

namespace App\Http\Controllers;

use App\Models\OrganizerReview;
use App\Models\ProfileCustomization;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\NotificationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        app(AchievementService::class)->recalculateForUser($user);

        $user->loadCount('reviewsReceived as organizer_reviews_count')
            ->loadAvg('reviewsReceived as organizer_rating_avg', 'rating');

        $loaded = $user->load([
            'participations' => function ($query) {
                $query->whereHas('competition', function ($q) {
                    $q->whereNull('deleted_at');
                })->with(['competition' => function ($q) {
                    $q->whereNull('deleted_at')->with(['tags', 'creator']);
                }])
                ->whereNull('deleted_at'); // Только активные участия
            },
            'competitions' => function ($query) {
                $query->whereNull('deleted_at') // Только активные объявления
                    ->with('tags')
                    ->orderBy('created_at', 'desc');
            },
            'userAchievements.achievement',
            'reviewsAuthored',
            'reviewsReceived' => function ($query) {
                $query->with(['reviewer', 'competition'])->latest();
            },
        ]);

        return $this->attachSelectedCustomizationAssets($loaded);
    }

    public function showUser(User $user)
    {
        app(AchievementService::class)->recalculateForUser($user);
        $user->loadCount('reviewsReceived as organizer_reviews_count')
            ->loadAvg('reviewsReceived as organizer_rating_avg', 'rating');

        // Показываем только публичные данные пользователя
        $loaded = $user->load([
            'competitions' => function ($query) {
                $query->whereNotIn('status', ['pending_review', 'needs_revision'])
                    ->with('tags')
                    ->orderBy('created_at', 'desc');
            },
            'participations' => function ($query) {
                $query->whereNull('deleted_at')
                    ->whereHas('competition', function ($q) {
                        $q->whereNull('deleted_at')
                            ->whereNotIn('status', ['pending_review', 'needs_revision']);
                    })
                    ->with(['competition' => function ($q) {
                        $q->whereNotIn('status', ['pending_review', 'needs_revision'])
                            ->with(['tags', 'creator']);
                    }]);
            },
            'userAchievements.achievement',
            'reviewsAuthored',
            'reviewsReceived' => function ($query) {
                $query->with(['reviewer', 'competition'])->latest();
            },
        ]);

        return $this->attachSelectedCustomizationAssets($loaded);
    }

    public function top(Request $request)
    {
        $metricColumns = [
            'first_places' => 'first_places_count',
            'second_places' => 'second_places_count',
            'third_places' => 'third_places_count',
            'participations' => 'participations_count',
            'top_three' => 'top_three_count',
            'top_one' => 'first_places_count',
        ];

        $validated = $request->validate([
            'metric' => ['nullable', Rule::in(array_keys($metricColumns))],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $metric = $validated['metric'] ?? 'first_places';
        $limit = $validated['limit'] ?? 20;
        $orderColumn = $metricColumns[$metric];

        $users = User::query()
            ->select([
                'id',
                'surname',
                'name',
                'patronymic',
                'username',
                'city',
                'avatar_url',
                'avatar_frame_key',
                'profile_background_key',
            ])
            ->withCount([
                'participations as participations_count' => function ($query) {
                    $query->whereIn('status', ['registered', 'finished', 'no_show']);
                },
                'participations as first_places_count' => function ($query) {
                    $query->where('status', 'finished')->where('place', 1);
                },
                'participations as second_places_count' => function ($query) {
                    $query->where('status', 'finished')->where('place', 2);
                },
                'participations as third_places_count' => function ($query) {
                    $query->where('status', 'finished')->where('place', 3);
                },
                'participations as top_three_count' => function ($query) {
                    $query->where('status', 'finished')->whereBetween('place', [1, 3]);
                },
            ])
            ->orderByDesc($orderColumn)
            ->orderByDesc('participations_count')
            ->orderBy('surname')
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(function (User $user, int $index) use ($orderColumn) {
                $this->attachSelectedCustomizationAssets($user);
                $user->setAttribute('rank', $index + 1);
                $user->setAttribute('rank_value', (int) $user->{$orderColumn});

                return $user;
            });

        return response()->json([
            'metric' => $metric,
            'users' => $users,
        ]);
    }

    public function reviews(Request $request)
    {
        $user = $request->user();

        return $this->buildReviewsResponse($user, true, (int) $request->query('per_page', 10));
    }

    public function showUserReviews(Request $request, User $user)
    {
        return $this->buildReviewsResponse($user, false, (int) $request->query('per_page', 10));
    }

    public function replyToReview(Request $request, OrganizerReview $review)
    {
        $user = $request->user();

        if ((int) $review->organizer_id !== (int) $user->id) {
            abort(403, 'Недостаточно прав для ответа на этот отзыв.');
        }

        $data = $request->validate([
            'organizer_reply' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        $review->update([
            'organizer_reply' => trim($data['organizer_reply']),
            'organizer_replied_at' => now(),
        ]);

        $review->load(['competition', 'reviewer']);

        if ($review->reviewer) {
            app(NotificationService::class)->sendToUser(
                $review->reviewer,
                'review_reply_received',
                'Организатор ответил на ваш отзыв',
                "Организатор ответил на ваш отзыв к соревнованию «{$review->competition?->title}».",
                [
                    'review_id' => $review->id,
                    'competition_id' => $review->competition_id,
                ]
            );
        }

        return response()->json([
            'message' => 'Ответ сохранён',
            'review' => $review,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'surname' => ['required', 'string', 'max:255', 'regex:/^[А-ЯЁ][а-яё]+(?:[ -][А-ЯЁ][а-яё]+)*$/u'],
            'name' => ['required', 'string', 'max:255', 'regex:/^[А-ЯЁ][а-яё]+(?:[ -][А-ЯЁ][а-яё]+)*$/u'],
            'patronymic' => ['required', 'string', 'max:255', 'regex:/^[А-ЯЁ][а-яё]+(?:[ -][А-ЯЁ][а-яё]+)*$/u'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username,' . $user->id],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'min:8', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/'],
            'city' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:500'],
        ]);

        $user->update($data);

        return response()->json(['message' => 'Профиль обновлен', 'user' => $user->fresh()]);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048'], // Максимум 2MB
        ]);

        $user = $request->user();

        // Удаляем старое фото, если есть
        if ($user->avatar_url) {
            $oldPath = $this->extractAvatarPath($user->avatar_url);
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Сохраняем новое фото
        $path = $this->storeCroppedAvatar($request->file('avatar'));
        // Используем хост запроса, чтобы URL работал при разных портах (frontend:3000, backend:8000)
        $baseUrl = $request->getSchemeAndHttpHost();
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $path)));
        $user->avatar_url = $baseUrl . '/api/avatars/' . $encodedPath;

        $user->save();

        return response()->json(['message' => 'Фото обновлено', 'avatar_url' => $user->avatar_url]);
    }

    public function avatar(string $path)
    {
        $decodedPath = ltrim(rawurldecode($path), '/');

        if (str_contains($decodedPath, '..') || !Str::startsWith($decodedPath, 'avatars/')) {
            abort(404);
        }

        if (!Storage::disk('public')->exists($decodedPath)) {
            abort(404);
        }

        return Storage::disk('public')->response($decodedPath);
    }

    public function customizationOptions(Request $request)
    {
        $user = $request->user()->load('userAchievements');
        $completedTasks = (int) $user->userAchievements->sum('level');
        $isAdmin = $user->isAdmin();
        $items = ProfileCustomization::orderBy('required_tasks')->get();

        return response()->json([
            'completed_tasks' => $completedTasks,
            'selected' => [
                'avatar_frame_key' => $user->avatar_frame_key,
                'profile_background_key' => $user->profile_background_key,
            ],
            'avatar_frames' => $this->buildUnlockedItems($items, $completedTasks, 'frame', $isAdmin),
            'profile_backgrounds' => $this->buildUnlockedItems($items, $completedTasks, 'background', $isAdmin),
        ]);
    }

    public function updateCustomization(Request $request)
    {
        $user = $request->user()->load('userAchievements');
        app(AchievementService::class)->recalculateForUser($user);
        $user->refresh()->load('userAchievements');

        $completedTasks = (int) $user->userAchievements->sum('level');
        $isAdmin = $user->isAdmin();
        $items = ProfileCustomization::orderBy('required_tasks')->get();

        $availableFrames = collect($this->buildUnlockedItems($items, $completedTasks, 'frame', $isAdmin))
            ->where('is_unlocked', true)
            ->pluck('key')
            ->all();
        $availableBackgrounds = collect($this->buildUnlockedItems($items, $completedTasks, 'background', $isAdmin))
            ->where('is_unlocked', true)
            ->pluck('key')
            ->all();

        $data = $request->validate([
            'avatar_frame_key' => ['nullable', 'string', 'in:' . implode(',', array_merge(['none'], $availableFrames))],
            'profile_background_key' => ['nullable', 'string', 'in:' . implode(',', array_merge(['none'], $availableBackgrounds))],
        ]);

        if (array_key_exists('avatar_frame_key', $data)) {
            $user->avatar_frame_key = $data['avatar_frame_key'] === 'none' ? null : $data['avatar_frame_key'];
        }
        if (array_key_exists('profile_background_key', $data)) {
            $user->profile_background_key = $data['profile_background_key'] === 'none' ? null : $data['profile_background_key'];
        }
        $user->save();

        return response()->json([
            'message' => 'Кастомизация профиля обновлена',
            'avatar_frame_key' => $user->avatar_frame_key,
            'profile_background_key' => $user->profile_background_key,
        ]);
    }

    public function enableTwoFactor(Request $request)
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json(['message' => 'Двухфакторная аутентификация уже включена'], 200);
        }

        $user->two_factor_enabled = true;
        $user->two_factor_code = null;
        $user->two_factor_code_sent_at = null;
        $user->save();

        return response()->json([
            'message' => 'Двухфакторная аутентификация включена. Теперь при входе вам будет отправляться код на электронную почту.',
        ]);
    }

    public function disableTwoFactor(Request $request)
    {
        $user = $request->user();

        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'Двухфакторная аутентификация уже отключена'], 200);
        }

        $user->two_factor_enabled = false;
        $user->two_factor_code = null;
        $user->two_factor_code_sent_at = null;
        $user->save();

        return response()->json(['message' => 'Двухфакторная аутентификация отключена']);
    }

    private function buildUnlockedItems($items, int $completedTasks, string $type, bool $isAdmin = false): array
    {
        return collect($items)
            ->filter(fn ($item) => $item->type === $type)
            ->values()
            ->map(function (ProfileCustomization $item) use ($completedTasks, $type, $isAdmin) {
            $required = (int) $item->required_tasks;
            if ($isAdmin) {
                return [
                    'key' => (string) $item->id,
                    'name' => $item->name,
                    'required_tasks' => $required,
                    'asset_path' => $this->buildCustomizationAssetPath($item->file_path),
                    'is_unlocked' => true,
                ];
            }

            $parityOk = $type === 'background'
                ? $completedTasks > 0 && $completedTasks % 2 === 0
                : $completedTasks % 2 === 1;
            return [
                'key' => (string) $item->id,
                'name' => $item->name,
                'required_tasks' => $required,
                'asset_path' => $this->buildCustomizationAssetPath($item->file_path),
                'is_unlocked' => $completedTasks >= $required && $parityOk,
            ];
        })
            ->all();
    }

    private function extractAvatarPath(string $url): ?string
    {
        if (str_contains($url, '/api/avatars/')) {
            $path = explode('/api/avatars/', $url, 2)[1] ?? '';
            $decoded = ltrim(rawurldecode($path), '/');
            return $decoded !== '' ? $decoded : null;
        }

        if (str_contains($url, '/storage/')) {
            $path = explode('/storage/', $url, 2)[1] ?? '';
            $decoded = ltrim(rawurldecode($path), '/');
            return $decoded !== '' ? $decoded : null;
        }

        return null;
    }

    private function storeCroppedAvatar(UploadedFile $file): string
    {
        $imageData = file_get_contents($file->getRealPath());
        if ($imageData === false) {
            abort(422, 'Не удалось обработать изображение.');
        }

        $source = imagecreatefromstring($imageData);
        if ($source === false) {
            abort(422, 'Не удалось обработать изображение.');
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $size = min($width, $height);
        $srcX = (int) floor(($width - $size) / 2);
        $srcY = (int) floor(($height - $size) / 2);

        $cropped = imagecreatetruecolor(512, 512);
        imagealphablending($cropped, false);
        imagesavealpha($cropped, true);
        $transparent = imagecolorallocatealpha($cropped, 0, 0, 0, 127);
        imagefill($cropped, 0, 0, $transparent);

        imagecopyresampled($cropped, $source, 0, 0, $srcX, $srcY, 512, 512, $size, $size);

        $extension = match ($file->getMimeType()) {
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'jpg',
        };

        $path = 'avatars/' . Str::uuid() . '.' . $extension;
        $fullPath = Storage::disk('public')->path($path);
        $directory = dirname($fullPath);

        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $saved = match ($extension) {
            'png' => imagepng($cropped, $fullPath),
            'gif' => imagegif($cropped, $fullPath),
            'webp' => imagewebp($cropped, $fullPath, 90),
            default => imagejpeg($cropped, $fullPath, 90),
        };

        imagedestroy($cropped);
        imagedestroy($source);

        if (!$saved) {
            abort(422, 'Не удалось сохранить изображение.');
        }

        return $path;
    }

    private function buildCustomizationAssetPath(string $filePath): string
    {
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $filePath)));
        $baseUrl = request()->getSchemeAndHttpHost();
        return $baseUrl . '/api/customizations/files/' . $encodedPath;
    }

    private function attachSelectedCustomizationAssets(User $user): User
    {
        $frame = null;
        $background = null;

        if ($user->avatar_frame_key) {
            $frame = ProfileCustomization::where('type', 'frame')->find((int) $user->avatar_frame_key);
        }
        if ($user->profile_background_key) {
            $background = ProfileCustomization::where('type', 'background')->find((int) $user->profile_background_key);
        }

        $user->setAttribute('avatar_frame_asset_path', $frame ? $this->buildCustomizationAssetPath($frame->file_path) : null);
        $user->setAttribute('profile_background_asset_path', $background ? $this->buildCustomizationAssetPath($background->file_path) : null);

        $reviewsCount = (int) ($user->organizer_reviews_count ?? 0);
        if ($reviewsCount === 0 && $user->relationLoaded('reviewsReceived')) {
            $reviewsCount = $user->reviewsReceived->count();
        }

        $ratingAvg = $user->organizer_rating_avg ?? null;
        if ($ratingAvg === null && $reviewsCount > 0) {
            $ratingAvg = $user->relationLoaded('reviewsReceived')
                ? $user->reviewsReceived->avg('rating')
                : $user->reviewsReceived()->avg('rating');
        }

        $user->setAttribute('organizer_rating_avg', $ratingAvg !== null ? round((float) $ratingAvg, 1) : 0);
        $user->setAttribute('organizer_reviews_count', $reviewsCount);

        return $user;
    }

    private function buildReviewsResponse(User $user, bool $includeAuthoredReviews, int $perPage): \Illuminate\Http\JsonResponse
    {
        app(AchievementService::class)->recalculateForUser($user);

        $safePerPage = max(1, min($perPage, 10));
        $user->loadCount('reviewsReceived as organizer_reviews_count')
            ->loadAvg('reviewsReceived as organizer_rating_avg', 'rating');

        if ($includeAuthoredReviews) {
            $user->load('reviewsAuthored');
        }

        $reviews = $user->reviewsReceived()
            ->with(['reviewer', 'competition'])
            ->latest()
            ->paginate($safePerPage);

        $this->attachSelectedCustomizationAssets($user);
        $reviews->getCollection()->transform(function ($review) {
            if ($review->reviewer) {
                $this->attachSelectedCustomizationAssets($review->reviewer);
            }

            return $review;
        });

        return response()->json([
            'organizer' => $user,
            'reviews' => $reviews,
        ]);
    }
}
