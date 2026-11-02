<?php

namespace Database\Seeders;

use App\Domain\Notifications\DefaultTemplates;
use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DefaultTemplates::email() as $event => [$subject, $body]) {
            NotificationTemplate::query()->firstOrCreate(['event' => $event, 'channel' => 'email'], ['subject' => $subject, 'body' => $body]);
        }
    }
}
