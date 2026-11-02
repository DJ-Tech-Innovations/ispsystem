<?php

namespace App\Providers;

use App\Support\PermissionCatalog;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // A malformed id is a 404, not a Postgres type error.
        Route::patterns(array_fill_keys(['lead', 'customer', 'plan', 'subscription', 'installation', 'invoice', 'payment', 'ticket', 'attachment', 'announcement', 'log', 'template', 'user', 'change'], '[0-9a-fA-F-]{36}'));
        Route::pattern('role', '[0-9]+');

        RateLimiter::for('messenger', fn (Request $request) => Limit::perMinute(600)->by($request->ip()));
        RateLimiter::for('support', fn (Request $request) => [Limit::perMinute(5)->by($request->ip()), Limit::perDay(30)->by($request->ip())]);
        RateLimiter::for('inquiries', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perDay(20)->by($request->ip())]);

        Model::preventLazyLoading(! app()->isProduction());

        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        // The owner role holds everything, including permissions added after it was created.
        Gate::before(fn ($user) => $user->hasRole(PermissionCatalog::OWNER) ? true : null);
    }
}
