<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number')->unique();
            $table->foreignUuid('customer_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 30);
            $table->string('subject');
            $table->text('description');
            $table->string('priority', 10)->default('normal');
            $table->string('status', 25)->default('open');
            $table->foreignUuid('assigned_to')->nullable()->index()->constrained('users')->nullOnDelete();
            $table->timestamp('due_at')->nullable()->index();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'priority']);
        });

        Schema::create('ticket_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->boolean('is_internal')->default(false);
            $table->timestamps();
        });

        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ticket_message_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size');
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('ticket_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('event', 30);
            $table->string('old_value')->nullable();
            $table->string('new_value')->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at');
        });

        Schema::create('notification_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event', 50);
            $table->string('channel', 10)->default('email');
            $table->string('subject')->nullable();
            $table->text('body');
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['event', 'channel']);
        });

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event', 50)->index();
            $table->string('channel', 10);
            $table->string('recipient');
            $table->string('subject')->nullable();
            $table->text('body');
            $table->string('status', 20)->default('queued')->index();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('email_enabled')->default(true);
            $table->boolean('sms_enabled')->default(false);
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('body');
            $table->string('audience', 20)->default('all'); // all | website | customers
            $table->boolean('is_published')->default(false)->index();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['announcements', 'notification_preferences', 'notification_logs', 'notification_templates', 'ticket_histories', 'ticket_attachments', 'ticket_messages', 'tickets'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
