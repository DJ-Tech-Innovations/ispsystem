<?php

use App\Domain\Billing\CollectionsService;
use App\Domain\Billing\GenerateInvoices;
use App\Domain\Messenger\MessengerClient;
use App\Domain\Tickets\TicketService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('billing:generate {--date= : Bill as of this date (Y-m-d)}', function (GenerateInvoices $generator) {
    $date = $this->option('date') ? today()->parse($this->option('date')) : today();
    $run = $generator->run($date);
    $this->info("Billing run {$run->id}: {$run->created_count} created, {$run->skipped_count} skipped, {$run->failed_count} failed.");
})->purpose('Generate invoices for eligible subscriptions. Safe to re-run.');

Artisan::command('billing:collections', function (CollectionsService $collections) {
    $this->info($collections->markOverdue().' invoices marked overdue, '.$collections->sendReminders().' reminders queued.');
})->purpose('Flag overdue invoices and send due and overdue reminders.');

Artisan::command('tickets:auto-close', function (TicketService $tickets) {
    $this->info($tickets->autoClose().' resolved tickets closed.');
})->purpose('Close tickets that stayed resolved past the configured window.');

Artisan::command('messenger:setup', function (MessengerClient $client) {
    $client->post('me/messenger_profile', ['get_started' => ['payload' => 'GET_STARTED']]);
    $this->info('Get Started button set on the Page.');
})->purpose('Set up the Page\'s Messenger profile. Run once after connecting.');

$timezone = config('app.timezone');
Schedule::command('billing:collections')->dailyAt('00:30')->timezone($timezone)->withoutOverlapping()->onOneServer();
Schedule::command('billing:generate')->dailyAt('01:00')->timezone($timezone)->withoutOverlapping()->onOneServer();
Schedule::command('tickets:auto-close')->dailyAt('02:00')->timezone($timezone)->withoutOverlapping()->onOneServer();
