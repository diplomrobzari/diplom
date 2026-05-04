<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competition_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reminder_key', 20);
            $table->timestamps();

            $table->unique(['competition_id', 'user_id', 'reminder_key']);
            $table->index(['reminder_key', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competition_reminders');
    }
};
