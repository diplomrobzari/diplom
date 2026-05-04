<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('description', 500)->nullable();
            $table->unsignedInteger('threshold');
            $table->timestamps();
        });

        DB::table('achievements')->insert([
            ['code' => 'participations', 'name' => 'Участник', 'description' => 'За каждые 15 участий в соревнованиях', 'threshold' => 15, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'first_place', 'name' => 'Победитель', 'description' => 'За каждые 5 первых мест', 'threshold' => 5, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'second_place', 'name' => 'Серебро', 'description' => 'За каждые 5 вторых мест', 'threshold' => 5, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'third_place', 'name' => 'Бронза', 'description' => 'За каждые 5 третьих мест', 'threshold' => 5, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('level')->default(0);
            $table->unsignedInteger('progress')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'achievement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('achievements');
    }
};
