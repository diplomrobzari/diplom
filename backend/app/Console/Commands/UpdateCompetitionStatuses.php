<?php

namespace App\Console\Commands;

use App\Models\Competition;
use Illuminate\Console\Command;

class UpdateCompetitionStatuses extends Command
{
    protected $signature = 'competitions:update-statuses';

    protected $description = 'Automatically update competition lifecycle statuses';

    public function handle(): void
    {
        Competition::chunk(100, function ($competitions) {
            foreach ($competitions as $competition) {
                $before = $competition->status;
                $competition->refreshStatus();
                if ($before !== $competition->status) {
                    $this->info("Updated #{$competition->id} to {$competition->status}");
                }
            }
        });
    }
}
