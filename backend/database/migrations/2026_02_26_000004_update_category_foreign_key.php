<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Сначала заполняем category_name для всех записей где есть category_id
        DB::statement('
            UPDATE competitions c
            INNER JOIN categories cat ON c.category_id = cat.id
            SET c.category_name = cat.name
            WHERE c.category_name IS NULL
        ');

        // Меняем внешний ключ на restrict (запрет удаления категории если есть связи)
        try {
            DB::statement('ALTER TABLE `competitions` DROP FOREIGN KEY `competitions_category_id_foreign`');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE `competitions` ADD CONSTRAINT `competitions_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT');
        } catch (\Exception $e) {}
    }

    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE `competitions` DROP FOREIGN KEY `competitions_category_id_foreign`');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE `competitions` ADD CONSTRAINT `competitions_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL');
        } catch (\Exception $e) {}
    }
};
