<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizer_reviews', function (Blueprint $table) {
            $table->text('organizer_reply')->nullable()->after('comment');
            $table->timestamp('organizer_replied_at')->nullable()->after('organizer_reply');
        });
    }

    public function down(): void
    {
        Schema::table('organizer_reviews', function (Blueprint $table) {
            $table->dropColumn(['organizer_reply', 'organizer_replied_at']);
        });
    }
};
