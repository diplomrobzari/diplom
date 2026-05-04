<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_customizations', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['frame', 'background']);
            $table->string('name', 255);
            $table->unsignedInteger('required_tasks');
            $table->string('file_path', 500);
            $table->timestamps();

            $table->unique(['type', 'required_tasks']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_customizations');
    }
};
