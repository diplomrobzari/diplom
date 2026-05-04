<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()
            ->where('email', 'admin@nastarte.ru')
            ->orWhere('username', 'admin')
            ->first();

        $data = [
            'surname' => 'Администратор',
            'name' => 'Главный',
            'patronymic' => 'Системный',
            'username' => 'admin',
            'city' => 'Москва',
            'bio' => 'Администратор платформы НаСтарте.',
            'password' => Hash::make('Admin12345'),
            'is_admin' => true,
            'is_banned' => false,
            'email_verified_at' => now(),
        ];

        if ($admin) {
            $admin->update($data);
            return;
        }

        User::create([
            ...$data,
            'email' => 'admin@nastarte.ru',
        ]);
    }
}
