<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'daswordplay@gmail.com'],
            [
                'surname' => 'Администратор',
                'name' => 'Главный',
                'patronymic' => 'Системный',
                'username' => 'admin',
                'city' => 'Москва',
                'bio' => 'Администратор платформы НаСтарте.',
                'password' => Hash::make('558790567'),
                'is_admin' => true,
                'is_banned' => false,
                'email_verified_at' => now(),
            ]
        );
    }
}
