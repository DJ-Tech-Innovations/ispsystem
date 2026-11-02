<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;

/** Safe production defaults only. Demo data lives in DemoSeeder and refuses to run in production. */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([RolesAndPermissionsSeeder::class, NotificationTemplateSeeder::class]);

        if (($email = env('OWNER_EMAIL')) && ($password = env('OWNER_PASSWORD'))) {
            User::query()->firstOrCreate(['email' => strtolower($email)], ['name' => env('OWNER_NAME', 'Owner'), 'password' => $password])
                ->syncRoles(PermissionCatalog::OWNER);
        }
    }
}
