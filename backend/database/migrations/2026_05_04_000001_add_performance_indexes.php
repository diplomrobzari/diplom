<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'competitions_status_created_idx');
            $table->index(['starts_at', 'status'], 'competitions_starts_status_idx');
            $table->index(['user_id', 'created_at'], 'competitions_user_created_idx');
            $table->index(['category_id', 'created_at'], 'competitions_category_created_idx');
            $table->index('city', 'competitions_city_idx');
        });

        Schema::table('participations', function (Blueprint $table) {
            $table->index(['competition_id', 'status'], 'participations_competition_status_idx');
            $table->index(['user_id', 'status'], 'participations_user_status_idx');
            $table->index(['status', 'place'], 'participations_status_place_idx');
        });

        Schema::table('organizer_reviews', function (Blueprint $table) {
            $table->index(['reviewer_id', 'created_at'], 'organizer_reviews_reviewer_created_idx');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['is_admin', 'is_banned'], 'users_admin_banned_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_admin_banned_idx');
        });

        Schema::table('organizer_reviews', function (Blueprint $table) {
            $table->dropIndex('organizer_reviews_reviewer_created_idx');
        });

        Schema::table('participations', function (Blueprint $table) {
            $table->dropIndex('participations_competition_status_idx');
            $table->dropIndex('participations_user_status_idx');
            $table->dropIndex('participations_status_place_idx');
        });

        Schema::table('competitions', function (Blueprint $table) {
            $table->dropIndex('competitions_status_created_idx');
            $table->dropIndex('competitions_starts_status_idx');
            $table->dropIndex('competitions_user_created_idx');
            $table->dropIndex('competitions_category_created_idx');
            $table->dropIndex('competitions_city_idx');
        });
    }
};
