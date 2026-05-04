<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Меняем внешний ключ для tag_id на restrictOnDelete
        // Если ключ уже удалён, игнорируем ошибку
        try {
            DB::statement('ALTER TABLE `competition_tag` DROP FOREIGN KEY `competition_tag_tag_id_foreign`');
        } catch (\Exception $e) {
            // Ключ может не существовать
        }
        
        try {
            DB::statement('ALTER TABLE `competition_tag` ADD CONSTRAINT `competition_tag_tag_id_foreign` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE RESTRICT');
        } catch (\Exception $e) {
            // Уже существует
        }
    }

    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE `competition_tag` DROP FOREIGN KEY `competition_tag_tag_id_foreign`');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE `competition_tag` ADD CONSTRAINT `competition_tag_tag_id_foreign` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE');
        } catch (\Exception $e) {}
    }
};
