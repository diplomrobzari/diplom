<?php

namespace App\Http\Controllers;

use App\Mail\AccountLocked;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    private const MAX_LOGIN_ATTEMPTS = 5;
    private const LOCK_DURATION_MINUTES = 10;

    public function register(Request $request)
    {
        $data = $request->validate([
            'surname' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'patronymic' => ['required', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'email' => ['required', 'email', 'regex:/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', 'unique:users,email'],
            'password' => ['required', 'min:8', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/'],
            'city' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:500'],
        ]);

        $user = User::create([
            'surname' => $data['surname'],
            'name' => $data['name'],
            'patronymic' => $data['patronymic'],
            'birth_date' => $data['birth_date'] ?? null,
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'city' => $data['city'] ?? null,
            'bio' => $data['bio'] ?? null,
        ]);

        // Токен без срока действия для всех пользователей
        $token = $user->createToken('api', ['*'])->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required'],
            'two_factor_code' => ['nullable', 'string'],
        ]);

        // Определяем, является ли вход email или username
        $isEmail = filter_var($data['login'], FILTER_VALIDATE_EMAIL);

        $user = $isEmail
            ? User::where('email', $data['login'])->first()
            : User::where('username', $data['login'])->first();

        // Проверяем, заблокирован ли аккаунт
        if ($user && $user->is_banned) {
            throw ValidationException::withMessages([
                'login' => ['Аккаунт заблокирован администратором.'],
            ]);
        }

        if ($user && $user->isLocked()) {
            $remainingMinutes = ceil($user->getLockRemainingTime()->i + ($user->getLockRemainingTime()->s > 0 ? 1 : 0));
            throw ValidationException::withMessages([
                'login' => ['Аккаунт заблокирован на ' . $remainingMinutes . ' мин. из-за множественных неудачных попыток входа.'],
            ]);
        }

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            // Увеличиваем счетчик неудачных попыток
            if ($user) {
                $attempts = $user->incrementLoginAttempts();
                $remaining = self::MAX_LOGIN_ATTEMPTS - $attempts;
                
                // Блокируем аккаунт после 5 неудачных попыток
                if ($attempts >= self::MAX_LOGIN_ATTEMPTS) {
                    $user->lockAccount(self::LOCK_DURATION_MINUTES);
                    
                    // Отправляем уведомление о блокировке
                    try {
                        Mail::to($user->email)->send(new AccountLocked($user, self::LOCK_DURATION_MINUTES));
                    } catch (Throwable $exception) {
                        Log::error('Failed to send account lock notification.', [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'error' => $exception->getMessage(),
                        ]);
                    }
                    
                    throw ValidationException::withMessages([
                        'login' => ['Аккаунт заблокирован на ' . self::LOCK_DURATION_MINUTES . ' мин. На ваш email отправлено уведомление.'],
                    ]);
                }
                
                // Сообщаем об оставшихся попытках
                throw ValidationException::withMessages([
                    'login' => ['Неверный email/имя пользователя или пароль. Осталось попыток: ' . $remaining . '.'],
                ]);
            }
            
            throw ValidationException::withMessages([
                'login' => ['Неверный email/имя пользователя или пароль.'],
            ]);
        }

        // Сбрасываем счетчик неудачных попыток при успешном входе
        if ($user) {
            $user->resetLoginAttempts();
        }

        if ($user->two_factor_enabled) {
            $code = $data['two_factor_code'] ?? null;
            
            // Если код не предоставлен — генерируем новый и отправляем на почту
            if (! $code) {
                $newCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                $user->two_factor_code = Hash::make($newCode);
                $user->two_factor_code_sent_at = now();
                $user->save();
                try {
                
                // Отправляем код на email
                \Mail::raw("Ваш код для входа: {$newCode}\n\nКод действителен в течение 10 минут.", function ($message) use ($user) {
                    $message->to($user->email)
                        ->subject('Код двухфакторной аутентификации');
                });
                } catch (Throwable $exception) {
                    Log::error('Failed to send two-factor login code.', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $exception->getMessage(),
                    ]);

                    $user->two_factor_code = null;
                    $user->two_factor_code_sent_at = null;
                    $user->save();

                    throw ValidationException::withMessages([
                        'login' => ['Не удалось отправить код двухфакторной аутентификации. Проверьте настройки почты на сервере.'],
                    ]);
                }

                return response()->json([
                    'two_factor_required' => true,
                    'message' => 'Код отправлен на вашу электронную почту.',
                ], 422);
            }
            
            // Проверяем код
            if (! $user->two_factor_code || ! Hash::check($code, $user->two_factor_code)) {
                throw ValidationException::withMessages([
                    'two_factor_code' => ['Неверный код двухфакторной аутентификации.'],
                ]);
            }
            
            // Проверяем, не истек ли код (10 минут)
            if ($user->two_factor_code_sent_at && now()->diffInMinutes($user->two_factor_code_sent_at) > 10) {
                throw ValidationException::withMessages([
                    'two_factor_code' => ['Срок действия кода истек. Попробуйте войти снова.'],
                ]);
            }
            
            // Очищаем код после успешного входа
            $user->two_factor_code = null;
            $user->two_factor_code_sent_at = null;
            $user->save();
        }

        // Токен без срока действия для всех пользователей
        $token = $user->createToken('api', ['*'])->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function me(Request $request)
    {
        return $request->user()->load(['participations.competition', 'competitions']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Выход выполнен']);
    }
}
