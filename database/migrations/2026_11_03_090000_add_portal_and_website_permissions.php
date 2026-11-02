<?php

use Database\Seeders\NotificationTemplateSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Grants one by one so that role edits made on the Roles page survive. */
return new class extends Migration
{
    public function up(): void
    {
        $grants = ['website.manage' => ['administrator'], 'customers.portal' => ['administrator', 'customer_service']];

        foreach ($grants as $name => $roles) {
            Permission::findOrCreate($name, 'web');
            Role::query()->with('permissions')->whereIn('name', $roles)->get()->each(fn (Role $role) => $role->givePermissionTo($name));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Fresh databases seed these later; existing ones need the two new templates now.
        if (Permission::query()->count() > 2) {
            Artisan::call('db:seed', ['--class' => NotificationTemplateSeeder::class, '--force' => true]);
        }
    }

    public function down(): void
    {
        Permission::query()->whereIn('name', ['website.manage', 'customers.portal'])->delete();
    }
};
