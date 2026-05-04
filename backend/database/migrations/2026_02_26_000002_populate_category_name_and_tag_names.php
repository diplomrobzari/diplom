<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Заполняем category_name для существующих записей
        DB::statement('
            UPDATE competitions c
            INNER JOIN categories cat ON c.category_id = cat.id
            SET c.category_name = cat.name
            WHERE c.category_name IS NULL AND c.category_id IS NOT NULL
        ');

        // Заполняем tag_names для существующих записей
        DB::statement('
            UPDATE competitions c
            SET c.tag_names = (
                SELECT JSON_ARRAYAGG(t.name)
                FROM competition_tag ct
                INNER JOIN tags t ON ct.tag_id = t.id
                WHERE ct.competition_id = c.id
            )
            WHERE c.tag_names IS NULL
        ');
    }

    public function down(): void
    {
        // Не откатываем данные
    }
};
