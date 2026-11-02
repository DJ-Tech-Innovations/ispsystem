<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('run_date')->index();
            $table->string('trigger', 20)->default('scheduler'); // scheduler | manual
            $table->string('status', 30)->default('running');
            $table->unsignedInteger('eligible_count')->default(0);
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->json('failures')->nullable();
            $table->foreignUuid('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number')->unique();
            $table->foreignUuid('customer_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('subscription_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUuid('billing_run_id')->nullable()->constrained()->nullOnDelete();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->date('issue_date');
            $table->date('due_date');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('adjustment', 12, 2)->default(0); // negative = discount
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->text('notes')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignUuid('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('void_reason')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'due_date']);
        });

        // A voided invoice may be reissued for its period; everything else must stay unique even under concurrent runs.
        DB::statement("CREATE UNIQUE INDEX invoices_subscription_period_unique ON invoices (subscription_id, period_start) WHERE status <> 'void'");

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 8, 2)->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique();
            $table->foreignUuid('customer_id')->constrained()->restrictOnDelete();
            $table->dateTime('paid_at')->index();
            $table->decimal('amount', 12, 2);
            $table->string('method', 30);
            $table->string('external_reference')->nullable();
            $table->foreignUuid('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->string('proof_path')->nullable();
            $table->string('proof_name')->nullable();
            $table->string('status', 20)->default('confirmed')->index(); // confirmed | reversed
            $table->timestamp('reversed_at')->nullable();
            $table->foreignUuid('reversed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reversal_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('invoice_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->unique(['payment_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        foreach (['payment_allocations', 'payments', 'invoice_items', 'invoices', 'billing_runs'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
