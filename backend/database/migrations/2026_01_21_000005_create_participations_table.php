<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('registered'); // registered, withdrawn, finished
            $table->unsignedInteger('place')->nullable();
            $table->decimal('score', 10, 2)->nullable();
            $table->string('result_note', 500)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'competition_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participations');
    }
};
