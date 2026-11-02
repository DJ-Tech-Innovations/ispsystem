<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Only where a person is in the bot's flow. Message text is deliberately not stored. */
    public function up(): void
    {
        Schema::create('messenger_conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('psid')->unique();
            $table->string('state', 30)->default('idle');
            $table->json('data')->nullable();
            $table->unsignedTinyInteger('misses')->default(0);
            $table->timestamp('paused_until')->nullable();
            $table->foreignUuid('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messenger_conversations');
    }
};
