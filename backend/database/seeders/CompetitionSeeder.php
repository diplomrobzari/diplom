<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Competition;
use App\Models\Participation;
use App\Models\Tag;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CompetitionSeeder extends Seeder
{
    public function run(): void
    {
        $organizer = User::firstOrCreate(
            ['email' => 'organizer@nastarte.ru'],
            [
                'surname' => 'Иванов',
                'name' => 'Иван',
                'patronymic' => 'Иванович',
                'username' => 'organizer',
                'city' => 'Москва',
                'bio' => 'Организатор демонстрационных соревнований.',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $participants = collect([
            ['email' => 'participant1@nastarte.ru', 'surname' => 'Петров', 'name' => 'Алексей', 'username' => 'participant1'],
            ['email' => 'participant2@nastarte.ru', 'surname' => 'Соколова', 'name' => 'Мария', 'username' => 'participant2'],
            ['email' => 'participant3@nastarte.ru', 'surname' => 'Кузнецов', 'name' => 'Дмитрий', 'username' => 'participant3'],
            ['email' => 'participant4@nastarte.ru', 'surname' => 'Волкова', 'name' => 'Анна', 'username' => 'participant4'],
            ['email' => 'participant5@nastarte.ru', 'surname' => 'Морозов', 'name' => 'Павел', 'username' => 'participant5'],
            ['email' => 'participant6@nastarte.ru', 'surname' => 'Smirnov', 'name' => 'Nikita', 'username' => 'participant6'],
            ['email' => 'participant7@nastarte.ru', 'surname' => 'Orlova', 'name' => 'Elena', 'username' => 'participant7'],
            ['email' => 'participant8@nastarte.ru', 'surname' => 'Fedorov', 'name' => 'Roman', 'username' => 'participant8'],
        ])->map(fn (array $user) => User::firstOrCreate(
            ['email' => $user['email']],
            [
                'surname' => $user['surname'],
                'name' => $user['name'],
                'patronymic' => 'Сергеевич',
                'username' => $user['username'],
                'city' => 'Москва',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        ))->values();

        $categories = collect([
            'sport' => 'Спорт',
            'winter-sport' => 'Зимний спорт',
            'intellectual' => 'Интеллектуальные игры',
            'online' => 'Онлайн-соревнования',
            'technology' => 'Технологии',
            'food' => 'Еда',
        ])->mapWithKeys(fn (string $name, string $slug) => [
            $slug => $this->findOrCreateBySlugOrName(Category::class, $slug, $name),
        ]);

        $tags = collect([
            'beginner' => 'для новичков',
            'team' => 'командное',
            'individual' => 'личное',
            'online' => 'онлайн',
            'offline' => 'очно',
            'rating' => 'рейтинговое',
        ])->mapWithKeys(fn (string $name, string $slug) => [
            $slug => $this->findOrCreateBySlugOrName(Tag::class, $slug, $name),
        ]);

        $now = CarbonImmutable::now();
        $currentYear = (int) $now->format('Y');
        $pastWinterYear = $now->month <= 2 ? $currentYear - 1 : $currentYear;
        $futureWinterYear = $now->month >= 3 ? $currentYear + 1 : $currentYear;
        $pastWinterDates = [
            CarbonImmutable::create($pastWinterYear, 1, 18, 10, 0),
            CarbonImmutable::create($pastWinterYear, 2, 8, 11, 0),
        ];
        $futureWinterDates = [
            CarbonImmutable::create($futureWinterYear, 1, 17, 10, 0),
            CarbonImmutable::create($futureWinterYear, 2, 7, 11, 0),
            CarbonImmutable::create($futureWinterYear, 2, 21, 10, 30),
        ];
        $items = [
            ['status' => 'finished', 'title' => 'Весенний забег 5 км', 'category' => 'sport', 'city' => 'Москва', 'starts_at' => $now->subDays(42), 'ends_at' => $now->subDays(42)->addHours(2), 'tags' => ['beginner', 'offline']],
            ['status' => 'finished', 'title' => 'Шахматный блиц-турнир', 'category' => 'intellectual', 'city' => 'Санкт-Петербург', 'starts_at' => $now->subDays(38), 'ends_at' => $now->subDays(38)->addHours(3), 'tags' => ['individual', 'rating']],
            ['status' => 'finished', 'title' => 'Лыжная гонка выходного дня', 'category' => 'winter-sport', 'city' => 'Казань', 'starts_at' => $now->subDays(35), 'ends_at' => $now->subDays(35)->addHours(4), 'tags' => ['offline', 'rating']],
            ['status' => 'finished', 'title' => 'Онлайн-квиз по спорту', 'category' => 'online', 'city' => 'Онлайн', 'starts_at' => $now->subDays(31), 'ends_at' => $now->subDays(31)->addHours(2), 'tags' => ['online', 'team']],
            ['status' => 'finished', 'title' => 'Сборка ПК на скорость', 'category' => 'technology', 'city' => 'Новосибирск', 'starts_at' => $now->subDays(26), 'ends_at' => $now->subDays(26)->addHours(3), 'tags' => ['individual', 'offline']],
            ['status' => 'finished', 'title' => 'Фуд-челлендж: бургер-лига', 'category' => 'food', 'city' => 'Екатеринбург', 'starts_at' => $now->subDays(22), 'ends_at' => $now->subDays(22)->addHours(2), 'tags' => ['individual', 'offline']],
            ['status' => 'finished', 'title' => 'Велозаезд по набережной', 'category' => 'sport', 'city' => 'Нижний Новгород', 'starts_at' => $now->subDays(18), 'ends_at' => $now->subDays(18)->addHours(3), 'tags' => ['beginner', 'offline']],
            ['status' => 'finished', 'title' => 'Командный турнир по настолкам', 'category' => 'intellectual', 'city' => 'Самара', 'starts_at' => $now->subDays(14), 'ends_at' => $now->subDays(14)->addHours(5), 'tags' => ['team', 'offline']],
            ['status' => 'recruiting', 'title' => 'Городской забег новичков', 'category' => 'sport', 'city' => 'Москва', 'starts_at' => $now->addDays(12), 'ends_at' => $now->addDays(12)->addHours(2), 'tags' => ['beginner', 'offline']],
            ['status' => 'recruiting', 'title' => 'Открытый шахматный вечер', 'category' => 'intellectual', 'city' => 'Санкт-Петербург', 'starts_at' => $now->addDays(15), 'ends_at' => $now->addDays(15)->addHours(3), 'tags' => ['individual', 'rating']],
            ['status' => 'recruiting', 'title' => 'Онлайн-турнир по стратегии', 'category' => 'online', 'city' => 'Онлайн', 'starts_at' => $now->addDays(18), 'ends_at' => $now->addDays(18)->addHours(4), 'tags' => ['online', 'rating']],
            ['status' => 'recruiting', 'title' => 'Лыжный старт для любителей', 'category' => 'winter-sport', 'city' => 'Пермь', 'starts_at' => $now->addDays(21), 'ends_at' => $now->addDays(21)->addHours(3), 'tags' => ['beginner', 'offline']],
            ['status' => 'recruiting', 'title' => 'ПК-мастерская: кабель-менеджмент', 'category' => 'technology', 'city' => 'Казань', 'starts_at' => $now->addDays(24), 'ends_at' => $now->addDays(24)->addHours(3), 'tags' => ['individual', 'offline']],
            ['status' => 'recruiting', 'title' => 'Пицца-марафон среди друзей', 'category' => 'food', 'city' => 'Воронеж', 'starts_at' => $now->addDays(27), 'ends_at' => $now->addDays(27)->addHours(2), 'tags' => ['team', 'offline']],
            ['status' => 'recruiting', 'title' => 'Командная эстафета во дворе', 'category' => 'sport', 'city' => 'Ростов-на-Дону', 'starts_at' => $now->addDays(30), 'ends_at' => $now->addDays(30)->addHours(2), 'tags' => ['team', 'beginner']],
            ['status' => 'recruiting', 'title' => 'Киберспортивный вечер 2x2', 'category' => 'online', 'city' => 'Онлайн', 'starts_at' => $now->addDays(33), 'ends_at' => $now->addDays(33)->addHours(4), 'tags' => ['online', 'team']],
            ['status' => 'pending_review', 'title' => 'Модерация: ночной шахматный кубок', 'category' => 'intellectual', 'city' => 'Москва', 'starts_at' => $now->addDays(36), 'ends_at' => $now->addDays(36)->addHours(3), 'tags' => ['individual', 'rating']],
            ['status' => 'pending_review', 'title' => 'Модерация: зимний лыжный круг', 'category' => 'winter-sport', 'city' => 'Тюмень', 'starts_at' => $now->addDays(39), 'ends_at' => $now->addDays(39)->addHours(4), 'tags' => ['offline', 'beginner']],
            ['status' => 'pending_review', 'title' => 'Модерация: онлайн-челлендж реакции', 'category' => 'online', 'city' => 'Онлайн', 'starts_at' => $now->addDays(42), 'ends_at' => $now->addDays(42)->addHours(2), 'tags' => ['online', 'individual']],
            ['status' => 'pending_review', 'title' => 'Модерация: чемпионат по хот-догам', 'category' => 'food', 'city' => 'Краснодар', 'starts_at' => $now->addDays(45), 'ends_at' => $now->addDays(45)->addHours(2), 'tags' => ['offline', 'individual']],
        ];

        $finishedResults = [
            [0, 1, 2, 3],
            [1, 0, 3, 4],
            [2, 1, 0, 5],
            [0, 2, 1, 6],
            [3, 4, 0, 1],
            [4, 1, 2, 0],
            [1, 5, 0, 3],
            [2, 0, 1, 4],
        ];
        $finishedIndex = 0;
        $pastWinterIndex = 0;
        $futureWinterIndex = 0;

        foreach ($items as $index => $item) {
            if ($item['category'] === 'winter-sport') {
                if ($item['status'] === 'finished') {
                    $winterDate = $pastWinterDates[$pastWinterIndex % count($pastWinterDates)];
                    $pastWinterIndex++;
                } else {
                    $winterDate = $futureWinterDates[$futureWinterIndex % count($futureWinterDates)];
                    $futureWinterIndex++;
                }

                $item['starts_at'] = $winterDate;
                $item['ends_at'] = $winterDate->addHours(4);
            }

            $maxParticipants = $item['status'] === 'pending_review' ? 20 : 30;
            $demoParticipantIndexes = $item['status'] === 'finished'
                ? ($finishedResults[$finishedIndex++] ?? [0, 1, 2])
                : [0, 1];
            $demoParticipants = collect($demoParticipantIndexes)
                ->map(fn (int $participantIndex) => $participants->get($participantIndex))
                ->filter()
                ->values();

            $competition = Competition::updateOrCreate(
                ['title' => $item['title']],
                [
                    'user_id' => $organizer->id,
                    'category_id' => $categories[$item['category']]->id,
                    'category_name' => $categories[$item['category']]->name,
                    'custom_category' => null,
                    'description' => "Демонстрационное объявление для проверки сайта. Формат, правила и результаты можно использовать как пример при тестировании.",
                    'city' => $item['city'],
                    'address' => $item['city'] === 'Онлайн' ? 'Онлайн-площадка' : 'Центральная площадка',
                    'latitude' => $item['city'] === 'Онлайн' ? null : 55.755800 + ($index / 1000),
                    'longitude' => $item['city'] === 'Онлайн' ? null : 37.617300 + ($index / 1000),
                    'starts_at' => $item['starts_at'],
                    'ends_at' => $item['ends_at'],
                    'max_participants' => $maxParticipants,
                    'current_participants' => $item['status'] === 'pending_review' ? 0 : $demoParticipants->count(),
                    'status' => $item['status'],
                    'is_public' => true,
                    'approved_at' => $item['status'] === 'pending_review' ? null : now(),
                    'moderation_comment' => null,
                    'tag_names' => collect($item['tags'])->map(fn (string $slug) => $tags[$slug]->name)->values()->all(),
                ]
            );

            $competition->tags()->sync(collect($item['tags'])->map(fn (string $slug) => $tags[$slug]->id)->all());

            Participation::withTrashed()
                ->where('competition_id', $competition->id)
                ->forceDelete();

            if ($item['status'] !== 'pending_review') {
                foreach ($demoParticipants as $place => $participant) {
                    Participation::updateOrCreate(
                        ['competition_id' => $competition->id, 'user_id' => $participant->id],
                        [
                            'status' => $item['status'] === 'finished' ? 'finished' : 'registered',
                            'place' => $item['status'] === 'finished' ? $place + 1 : null,
                            'score' => $item['status'] === 'finished' ? 100 - ($place * 7) : null,
                            'result_note' => $item['status'] === 'finished' ? 'Демо-результат' : null,
                        ]
                    );
                }
            }
        }
    }

    /**
     * Existing demo databases may already contain the same visible name with a
     * different slug, so we reuse either match instead of violating unique keys.
     */
    private function findOrCreateBySlugOrName(string $modelClass, string $slug, string $name): Model
    {
        $model = $modelClass::query()
            ->where('slug', $slug)
            ->orWhere('name', $name)
            ->first();

        if ($model) {
            return $model;
        }

        return $modelClass::create([
            'slug' => $slug,
            'name' => $name,
        ]);
    }
}
