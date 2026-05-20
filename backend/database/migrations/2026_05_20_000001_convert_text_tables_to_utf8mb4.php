<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        foreach ($this->tables() as $table) {
            if (Schema::hasTable($table)) {
                DB::statement("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
        }

        $this->repairEmptyTagSlugs();
    }

    public function down(): void
    {
        // Charset conversion is intentionally not reverted.
    }

    private function tables(): array
    {
        return [
            'users',
            'categories',
            'tags',
            'competitions',
            'organizer_reviews',
            'achievements',
            'user_notifications',
            'profile_customizations',
            'competition_reminders',
            'password_reset_tokens',
            'personal_access_tokens',
            'failed_jobs',
        ];
    }

    private function repairEmptyTagSlugs(): void
    {
        if (! Schema::hasTable('tags')) {
            return;
        }

        $tags = DB::table('tags')
            ->whereNull('slug')
            ->orWhere('slug', '')
            ->orderBy('id')
            ->get(['id', 'name']);

        foreach ($tags as $tag) {
            $base = Str::slug((string) $tag->name) ?: 'tag-' . $tag->id;
            $slug = $base;
            $counter = 2;

            while (DB::table('tags')->where('slug', $slug)->where('id', '!=', $tag->id)->exists()) {
                $slug = $base . '-' . $counter;
                $counter++;
            }

            DB::table('tags')->where('id', $tag->id)->update(['slug' => $slug]);
        }
    }
};
