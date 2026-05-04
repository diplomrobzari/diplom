<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_frame_key', 100)->nullable()->after('avatar_url');
            $table->string('profile_background_key', 100)->nullable()->after('avatar_frame_key');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_frame_key', 'profile_background_key']);
        });
    }
};
