<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });

        // Gap-free, concurrency-safe counters behind every reference number.
        Schema::create('sequences', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->unsignedBigInteger('value')->default(0);
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('module', 40)->index();
            $table->string('event', 40)->index();
            $table->string('description');
            $table->nullableUuidMorphs('subject');
            $table->json('properties')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->index();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique();
            $table->string('name');
            $table->string('email')->nullable()->index();
            $table->string('mobile', 30)->nullable()->index();
            $table->string('address')->nullable();
            $table->string('source', 30)->default('walk_in');
            $table->string('status', 20)->default('new')->index();
            $table->foreignUuid('service_plan_id')->nullable();
            $table->foreignUuid('assigned_to')->nullable()->index()->constrained('users')->nullOnDelete();
            $table->date('follow_up_on')->nullable()->index();
            $table->text('notes')->nullable();
            $table->string('lost_reason')->nullable();
            $table->foreignUuid('customer_id')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique();
            $table->string('type', 20)->default('residential');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('organization_name')->nullable();
            $table->string('email')->nullable()->index();
            $table->string('mobile', 30)->nullable()->index();
            $table->string('alternate_contact', 30)->nullable();
            $table->string('billing_address');
            $table->string('service_address');
            $table->string('landmark')->nullable();
            $table->text('account_notes')->nullable();
            $table->string('status', 20)->default('registered')->index();
            $table->date('registered_on');
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete(); // future portal login
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });

        Schema::create('customer_status_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained()->cascadeOnDelete();
            $table->string('old_status', 20)->nullable();
            $table->string('new_status', 20);
            $table->string('reason')->nullable();
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at');
        });

        // CRM timeline: calls, visits and notes staff log against a customer.
        Schema::create('customer_interactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('note');
            $table->text('body');
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('service_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->string('speed_description');
            $table->decimal('monthly_price', 12, 2);
            $table->decimal('installation_fee', 12, 2)->default(0);
            $table->boolean('installation_fee_recurring')->default(false);
            $table->string('billing_cycle', 20)->default('monthly');
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_public')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreign('service_plan_id')->references('id')->on('service_plans')->nullOnDelete();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique();
            $table->foreignUuid('customer_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('service_plan_id')->constrained()->restrictOnDelete();
            $table->string('service_address');
            $table->date('activated_on')->nullable();
            $table->date('billing_start_date')->nullable();
            $table->unsignedTinyInteger('billing_day')->nullable();
            $table->date('next_billing_date')->nullable()->index();
            $table->decimal('monthly_amount', 12, 2);
            $table->decimal('installation_fee', 12, 2)->default(0);
            $table->timestamp('installation_fee_billed_at')->nullable();
            $table->decimal('deposit', 12, 2)->default(0);
            $table->string('status', 20)->default('pending')->index();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('subscription_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('subscription_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('status'); // status | plan | price
            $table->string('old_value')->nullable();
            $table->string('new_value');
            $table->string('reason')->nullable();
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at');
        });

        Schema::create('installation_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique();
            $table->foreignUuid('customer_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('subscription_id')->constrained()->restrictOnDelete();
            $table->string('address');
            $table->dateTime('preferred_at')->nullable()->index();
            $table->foreignUuid('technician_id')->nullable()->index()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('pending')->index();
            $table->text('notes')->nullable();
            $table->text('completion_remarks')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('installation_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('installation_job_id')->constrained()->cascadeOnDelete();
            $table->string('old_status', 20)->nullable();
            $table->string('new_status', 20);
            $table->text('remarks')->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        foreach (['installation_updates', 'installation_jobs', 'subscription_histories', 'subscriptions'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['service_plan_id']);
            $table->dropForeign(['customer_id']);
        });
        foreach (['service_plans', 'customer_interactions', 'customer_status_histories', 'customers', 'leads', 'activity_logs', 'sequences', 'settings'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
