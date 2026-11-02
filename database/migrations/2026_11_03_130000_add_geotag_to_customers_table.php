<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('geo_source', 20)->nullable(); // map | gps | coordinates
            $table->unsignedInteger('geo_accuracy')->nullable(); // metres, from a device
            $table->boolean('geo_stale')->default(false); // the address changed after the pin was placed
            $table->timestamp('geo_tagged_at')->nullable();
            $table->foreignUuid('geo_tagged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index(['latitude', 'longitude']);
        });

        $grants = ['customers.geotag' => ['administrator', 'customer_service'], 'customers.map' => ['administrator', 'customer_service']];
        foreach ($grants as $name => $roles) {
            Permission::findOrCreate($name, 'web');
            Role::query()->with('permissions')->whereIn('name', $roles)->get()->each(fn (Role $role) => $role->givePermissionTo($name));
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['geo_tagged_by']);
            $table->dropIndex(['latitude', 'longitude']);
            $table->dropColumn(['latitude', 'longitude', 'geo_source', 'geo_accuracy', 'geo_stale', 'geo_tagged_at', 'geo_tagged_by']);
        });
        Permission::query()->whereIn('name', ['customers.geotag', 'customers.map'])->delete();
    }
};
