<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompetitionController;
use App\Http\Controllers\GeocodeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ParticipationController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProfileController;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn() => ['status' => 'ok']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Сброс пароля
Route::post('/auth/password/reset/send', [PasswordResetController::class, 'sendResetCode']);
Route::post('/auth/password/reset', [PasswordResetController::class, 'resetPassword']);

Route::get('/categories', fn() => Category::all());
Route::get('/tags', fn() => Tag::all());
Route::get('/geocode', [GeocodeController::class, 'search']);

Route::get('/competitions', [CompetitionController::class, 'index']);
Route::get('/users/top', [ProfileController::class, 'top']);
Route::get('/users/{user}/reviews', [ProfileController::class, 'showUserReviews']);
Route::get('/users/{user}', [ProfileController::class, 'showUser']);
Route::get('/avatars/{path}', [ProfileController::class, 'avatar'])->where('path', '.*');
Route::get('/customizations/files/{path}', [AdminController::class, 'customizationFile'])->where('path', '.*');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Важно: маршрут /competitions/pending должен быть ПЕРЕД /competitions/{competition}
    // чтобы Laravel не интерпретировал "pending" как ID конкурса
    Route::get('/competitions/pending', [CompetitionController::class, 'pending']);

    Route::post('/competitions', [CompetitionController::class, 'store']);
    Route::put('/competitions/{competition}', [CompetitionController::class, 'update']);
    Route::post('/competitions/{competition}/approve', [CompetitionController::class, 'approve']);
    Route::post('/competitions/{competition}/request-revision', [CompetitionController::class, 'requestRevision']);
    Route::post('/competitions/{competition}/submit-for-review', [CompetitionController::class, 'submitForReview']);
    Route::delete('/competitions/{competition}', [CompetitionController::class, 'destroy']);
    Route::post('/competitions/{competition}/restore', [CompetitionController::class, 'restore']);
    Route::get('/competitions/archived', [CompetitionController::class, 'archived']);
    Route::post('/competitions/{competition}/register', [CompetitionController::class, 'register']);
    Route::post('/competitions/{competition}/unregister', [CompetitionController::class, 'unregister']);
    Route::delete('/competitions/{competition}/participants/{userId}', [CompetitionController::class, 'removeParticipant']);
    Route::post('/competitions/{competition}/participants/{userId}/no-show', [CompetitionController::class, 'markNoShow']);
    Route::post('/competitions/{competition}/results', [CompetitionController::class, 'results']);
    Route::post('/competitions/{competition}/finish', [CompetitionController::class, 'finish']);
    Route::post('/competitions/{competition}/review', [CompetitionController::class, 'storeReview']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::get('/profile/reviews', [ProfileController::class, 'reviews']);
    Route::post('/profile/reviews/{review}/reply', [ProfileController::class, 'replyToReview']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);
    Route::get('/profile/customization-options', [ProfileController::class, 'customizationOptions']);
    Route::put('/profile/customization', [ProfileController::class, 'updateCustomization']);
    Route::post('/profile/two-factor/enable', [ProfileController::class, 'enableTwoFactor']);
    Route::post('/profile/two-factor/disable', [ProfileController::class, 'disableTwoFactor']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::delete('/notifications', [NotificationController::class, 'destroySelected']);
    Route::post('/notifications/delete-selected', [NotificationController::class, 'destroySelected']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Архив участий
    Route::get('/participations/archived', [ParticipationController::class, 'archived']);
    Route::delete('/participations/{participation}', [ParticipationController::class, 'destroy']);
    Route::post('/participations/{participation}/restore', [ParticipationController::class, 'restore']);

    // Админ: теги, категории, статистика
    Route::get('/admin/stats', [AdminController::class, 'stats']);
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::post('/admin/users/{user}/ban', [AdminController::class, 'banUser']);
    Route::post('/admin/users/{user}/unban', [AdminController::class, 'unbanUser']);
    Route::post('/admin/users/{user}/promote', [AdminController::class, 'promoteUser']);
    Route::post('/admin/tags', [AdminController::class, 'storeTag']);
    Route::put('/admin/tags/{tag}', [AdminController::class, 'updateTag']);
    Route::delete('/admin/tags/{tag}', [AdminController::class, 'destroyTag']);
    Route::post('/admin/categories', [AdminController::class, 'storeCategory']);
    Route::put('/admin/categories/{category}', [AdminController::class, 'updateCategory']);
    Route::delete('/admin/categories/{category}', [AdminController::class, 'destroyCategory']);
    Route::get('/admin/customizations', [AdminController::class, 'customizations']);
    Route::post('/admin/customizations', [AdminController::class, 'storeCustomization']);
    Route::put('/admin/customizations/{customization}', [AdminController::class, 'updateCustomization']);
    Route::post('/admin/customizations/{customization}', [AdminController::class, 'updateCustomization']);
    Route::delete('/admin/customizations/{customization}', [AdminController::class, 'destroyCustomization']);
});

// Маршруты с параметром {competition} должны быть после всех специфических маршрутов
Route::get('/competitions/{competition}', [CompetitionController::class, 'show']);
Route::get('/competitions/{competition}/participants', [CompetitionController::class, 'participants']);
