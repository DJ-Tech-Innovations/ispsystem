<?php

use App\Support\UniqueOpenRow;
use Database\Seeders\NotificationTemplateSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_change_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique();
            $table->foreignUuid('customer_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('subscription_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('from_plan_id')->constrained('service_plans')->restrictOnDelete();
            $table->foreignUuid('to_plan_id')->constrained('service_plans')->restrictOnDelete();
            $table->decimal('current_amount', 12, 2);
            $table->decimal('requested_amount', 12, 2); // the price the customer saw and agreed to
            $table->string('status', 20)->default('pending')->index();
            $table->string('decision_reason')->nullable();
            $table->foreignUuid('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });

        // The database itself refuses a second open request, even from a double click.
        UniqueOpenRow::add('plan_change_requests', 'plan_change_one_pending', ['subscription_id'], "status = 'pending'");

        $grants = ['plan_changes.view' => ['administrator', 'billing', 'customer_service'], 'plan_changes.approve' => ['administrator', 'billing']];
        foreach ($grants as $name => $roles) {
            Permission::findOrCreate($name, 'web');
            Role::query()->with('permissions')->whereIn('name', $roles)->get()->each(fn (Role $role) => $role->givePermissionTo($name));
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Artisan::call('db:seed', ['--class' => NotificationTemplateSeeder::class, '--force' => true]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_change_requests');
        Permission::query()->whereIn('name', ['plan_changes.view', 'plan_changes.approve'])->delete();
    }
};
