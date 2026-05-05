<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Competition;
use App\Models\Participation;
use App\Models\ProfileCustomization;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            // Файлы кастомизации должны быть доступны публично всем пользователям.
            if ($request->is('api/customizations/files/*')) {
                return $next($request);
            }

            if (!$request->user() || !$request->user()->isAdmin()) {
                abort(403, 'Доступ только для администратора');
            }
            return $next($request);
        });
    }

    /** Теги */
    public function users(Request $request)
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $search = $data['search'] ?? null;
        $perPage = $data['per_page'] ?? 15;

        return User::query()
            ->withCount(['competitions', 'participations'])
            ->when($search, function ($query, string $value) {
                $query->where(function ($inner) use ($value) {
                    $inner->where('name', 'like', "%{$value}%")
                        ->orWhere('surname', 'like', "%{$value}%")
                        ->orWhere('patronymic', 'like', "%{$value}%")
                        ->orWhere('username', 'like', "%{$value}%")
                        ->orWhere('email', 'like', "%{$value}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function banUser(Request $request, User $user)
    {
        $this->ensureCanModerateUser($request->user(), $user);

        $user->forceFill(['is_banned' => true])->save();
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Пользователь заблокирован',
            'user' => $user->loadCount(['competitions', 'participations']),
        ]);
    }

    public function unbanUser(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            abort(422, 'Нельзя менять блокировку собственного аккаунта');
        }

        $user->forceFill(['is_banned' => false])->save();

        return response()->json([
            'message' => 'Пользователь разблокирован',
            'user' => $user->loadCount(['competitions', 'participations']),
        ]);
    }

    public function promoteUser(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            abort(422, 'Вы уже администратор');
        }

        if ($user->isAdmin()) {
            abort(422, 'Пользователь уже является администратором');
        }

        $user->forceFill([
            'is_admin' => true,
            'is_banned' => false,
        ])->save();

        return response()->json([
            'message' => 'Пользователь назначен администратором',
            'user' => $user->loadCount(['competitions', 'participations']),
        ]);
    }

    private function ensureCanModerateUser(User $admin, User $user): void
    {
        if ($admin->id === $user->id) {
            abort(422, 'Нельзя заблокировать собственный аккаунт');
        }

        if ($user->isAdmin()) {
            abort(422, 'Нельзя заблокировать администратора');
        }
    }

    public function storeTag(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);
        $slug = Str::slug($data['name']);
        $tag = Tag::firstOrCreate(['slug' => $slug], ['name' => $data['name']]);
        return response()->json($tag, 201);
    }

    public function updateTag(Request $request, Tag $tag)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);
        $tag->name = $data['name'];
        $tag->slug = Str::slug($data['name']);
        $tag->save();
        return response()->json($tag);
    }

    public function destroyTag(Tag $tag)
    {
        $tag->delete();
        return response()->json(['message' => 'Тег удалён']);
    }

    /** Категории */
    public function storeCategory(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);
        $slug = Str::slug($data['name']);
        $category = Category::firstOrCreate(['slug' => $slug], ['name' => $data['name']]);
        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);
        $category->name = $data['name'];
        $category->slug = Str::slug($data['name']);
        $category->save();
        return response()->json($category);
    }

    public function destroyCategory(Category $category)
    {
        $category->delete();
        return response()->json(['message' => 'Категория удалена']);
    }

    /** Статистика */
    public function stats(Request $request)
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        $endDate = !empty($validated['end_date']) ? now()->parse($validated['end_date'])->endOfDay() : now();
        $startDate = !empty($validated['start_date'])
            ? now()->parse($validated['start_date'])->startOfDay()
            : $endDate->copy()->subDays(6)->startOfDay(); // по умолчанию последние 7 дней

        if ($startDate->greaterThan($endDate)) {
            $tmp = $startDate;
            $startDate = $endDate->copy()->subDays(6)->startOfDay();
            $endDate = $tmp->endOfDay();
        }

        // Ограничим диапазон 365 днями, чтобы не грузить систему
        if ($startDate->diffInDays($endDate) > 365) {
            $startDate = $endDate->copy()->subDays(365)->startOfDay();
        }

        $usersCount = User::count();
        $competitionsCount = Competition::count();
        $participationsCount = Participation::count();

        $competitionsByStatus = Competition::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $competitionsByDay = Competition::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        // Добавим все дни периода с нулевыми значениями
        $allDays = [];
        $current = $startDate->copy();
        while ($current <= $endDate) {
            $dateStr = $current->toDateString();
            $allDays[$dateStr] = $competitionsByDay[$dateStr] ?? 0;
            $current->addDay();
        }

        $participationsByDay = Participation::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        // Добавим все дни периода с нулевыми значениями
        $allParticipationDays = [];
        $current = $startDate->copy();
        while ($current <= $endDate) {
            $dateStr = $current->toDateString();
            $allParticipationDays[$dateStr] = $participationsByDay[$dateStr] ?? 0;
            $current->addDay();
        }

        $topCategories = Category::withCount('competitions')
            ->orderByDesc('competitions_count')
            ->limit(10)
            ->get()
            ->map(fn ($c) => ['name' => $c->name, 'count' => $c->competitions_count]);

        $topTags = Tag::withCount('competitions')
            ->orderByDesc('competitions_count')
            ->limit(10)
            ->get()
            ->map(fn ($t) => ['name' => $t->name, 'count' => $t->competitions_count]);

        return response()->json([
            'users_count' => $usersCount,
            'competitions_count' => $competitionsCount,
            'participations_count' => $participationsCount,
            'competitions_by_status' => $competitionsByStatus,
            'competitions_last_period' => $allDays,
            'participations_last_period' => $allParticipationDays,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'top_categories' => $topCategories,
            'top_tags' => $topTags,
        ]);
    }

    /** Кастомизация профиля */
    public function customizations()
    {
        $items = ProfileCustomization::orderBy('type')
            ->orderBy('required_tasks')
            ->get()
            ->map(fn (ProfileCustomization $item) => $this->mapCustomization($item));

        return response()->json($items);
    }

    public function storeCustomization(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'in:frame,background'],
            'name' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:10240'],
        ]);

        $nextRequired = ProfileCustomization::where('type', $data['type'])->max('required_tasks');
        $nextRequired = $nextRequired ? $nextRequired + 2 : ($data['type'] === 'frame' ? 1 : 2);

        $storedPath = $request->file('file')->store("customizations/{$data['type']}", 'public');

        $item = ProfileCustomization::create([
            'type' => $data['type'],
            'name' => $data['name'],
            'required_tasks' => $nextRequired,
            'file_path' => $storedPath,
        ]);

        return response()->json($this->mapCustomization($item), 201);
    }

    public function updateCustomization(Request $request, ProfileCustomization $customization)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:10240'],
        ]);

        $customization->name = $data['name'];

        if ($request->hasFile('file')) {
            if ($customization->file_path && Storage::disk('public')->exists($customization->file_path)) {
                Storage::disk('public')->delete($customization->file_path);
            }
            $customization->file_path = $request->file('file')->store("customizations/{$customization->type}", 'public');
        }

        $customization->save();

        return response()->json($this->mapCustomization($customization));
    }

    public function destroyCustomization(ProfileCustomization $customization)
    {
        DB::transaction(function () use ($customization) {
            $removedType = $customization->type;
            $removedRequired = $customization->required_tasks;

            if ($customization->file_path && Storage::disk('public')->exists($customization->file_path)) {
                Storage::disk('public')->delete($customization->file_path);
            }

            $customization->delete();

            ProfileCustomization::where('type', $removedType)
                ->where('required_tasks', '>', $removedRequired)
                ->orderBy('required_tasks')
                ->get()
                ->each(function (ProfileCustomization $item) {
                    $item->required_tasks = max(1, $item->required_tasks - 2);
                    $item->save();
                });
        });

        return response()->json(['message' => 'Элемент кастомизации удален']);
    }

    public function customizationFile(string $path)
    {
        $decodedPath = ltrim(rawurldecode($path), '/');
        if (str_contains($decodedPath, '..') || !Str::startsWith($decodedPath, 'customizations/')) {
            abort(404);
        }

        if (!Storage::disk('public')->exists($decodedPath)) {
            abort(404);
        }

        return Storage::disk('public')->response($decodedPath);
    }

    private function mapCustomization(ProfileCustomization $item): array
    {
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $item->file_path)));
        $assetPath = request()->getSchemeAndHttpHost() . '/api/customizations/files/' . $encodedPath;

        return [
            'id' => $item->id,
            'type' => $item->type,
            'name' => $item->name,
            'required_tasks' => $item->required_tasks,
            'asset_path' => $assetPath,
        ];
    }
}
