<?php

namespace App\Providers;

use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\NeutralResetLinkResponse;
use App\Http\Responses\PasswordChangedResponse;
use App\Http\Responses\SignInResponse;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\PasswordResetResponse;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(LoginResponse::class, SignInResponse::class);
        $this->app->bind(PasswordResetResponse::class, PasswordChangedResponse::class);
        $this->app->singleton(FailedPasswordResetLinkRequestResponse::class, NeutralResetLinkResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        Fortify::loginView(fn () => Inertia::render('auth/login'));
        Fortify::requestPasswordResetLinkView(fn () => Inertia::render('auth/forgot-password', ['status' => session('status'), 'portal' => request()->boolean('portal'), 'email' => request()->query('email')]));
        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'token' => $request->route('token'),
            'email' => $request->query('email'),
        ]));

        // Inactive accounts can't sign in, and each outcome lands on the audit trail.
        Fortify::authenticateUsing(function (Request $request) {
            $user = User::query()->where('email', Str::lower($request->input('email')))->first();

            if (! $user || ! $user->isStaff() || ! Hash::check((string) $request->input('password'), $user->password)) {
                Audit::log('auth', 'failed_login', 'Failed sign-in for '.Str::limit((string) $request->input('email'), 100));

                return null;
            }
            if (! $user->is_active) {
                Audit::log('auth', 'blocked_login', "Blocked sign-in for inactive user {$user->email}", $user);

                return null;
            }

            return $user;
        });

        Event::listen(Login::class, function (Login $event) {
            $event->user->forceFill(['last_login_at' => now()])->saveQuietly();
            Audit::log('auth', 'login', "{$event->user->name} signed in", $event->user);
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

    }
}
