<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Отправить код сброса пароля на email
     */
    public function sendResetCode(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // Генерируем 6-значный код
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Сохраняем хеш кода и время истечения (15 минут)
        \DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($code),
                'created_at' => now(),
            ]
        );

        // Отправляем email
        Mail::raw("Ваш код сброса пароля: {$code}\n\nКод действителен в течение 15 минут.", function ($message) use ($user) {
            $message->to($user->email)
                ->subject('Сброс пароля');
        });

        return response()->json(['message' => 'Код сброса пароля отправлен на email']);
    }

    /**
     * Проверить код и сбросить пароль
     */
    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
            'new_password' => ['required', 'min:8', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/'],
        ]);

        $resetToken = \DB::table('password_reset_tokens')
            ->where('email', $data['email'])
            ->first();

        if (!$resetToken) {
            throw ValidationException::withMessages([
                'code' => ['Код сброса не найден. Запросите новый.'],
            ]);
        }

        // Проверяем, не истек ли код (15 минут)
        if (now()->diffInMinutes($resetToken->created_at) > 15) {
            \DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages([
                'code' => ['Срок действия кода истек. Запросите новый.'],
            ]);
        }

        // Проверяем код
        if (!Hash::check($data['code'], $resetToken->token)) {
            throw ValidationException::withMessages([
                'code' => ['Неверный код сброса.'],
            ]);
        }

        // Сбрасываем пароль
        $user = User::where('email', $data['email'])->first();
        $user->password = Hash::make($data['new_password']);
        $user->save();

        // Удаляем использованный токен
        \DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['message' => 'Пароль успешно сброшен']);
    }
}
