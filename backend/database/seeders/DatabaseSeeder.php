<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \App\Models\User::updateOrCreate(
            ['email' => 'admin@nastarte.ru'],
            [
                'name' => 'Admin',
                'username' => 'admin',
                'password' => Hash::make('password'),
                'is_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        $categories = [
            'Бег',
            'Велоспорт',
            'Киберспорт',
            'Триатлон',
        ];

        foreach ($categories as $name) {
            \App\Models\Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name]
            );
        }

        $tags = ['любители', 'профи', 'командное', 'личное'];
        foreach ($tags as $tag) {
            \App\Models\Tag::firstOrCreate(
                ['slug' => Str::slug($tag)],
                ['name' => $tag]
            );
        }

        $this->call(CompetitionSeeder::class);
    }
}
