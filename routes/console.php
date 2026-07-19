<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Requires the server's cron to call `php artisan schedule:run` every
// minute (standard Laravel scheduler setup) — this entry itself only
// declares *what* runs daily, not the OS-level trigger that ticks the clock.
Schedule::command('maintenance:check-overdue-cleaning')->daily();
