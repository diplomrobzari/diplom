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
            ->where('email', 'daswordplay@gmail.com')
            ->orWhere('username', 'admin')
            ->first();

        $data = [
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
        ];

        if ($admin) {
            $admin->update($data);
            return;
        }

        User::create([
            ...$data,
            'email' => 'daswordplay@gmail.com',
        ]);
    }
}
