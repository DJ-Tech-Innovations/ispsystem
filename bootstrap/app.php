<?php

use App\Http\Controllers\Site\SiteController;
use App\Http\Middleware\EnsureActiveStaff;
use App\Http\Middleware\EnsureActiveSubscriber;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: fn () => Route::group([], base_path('routes/webhooks.php')),
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Shared page data loads before records are looked up, so a missing record can still render the 404 page.
        $middleware->web(remove: [SubstituteBindings::class], append: [HandleInertiaRequests::class, SubstituteBindings::class]);
        $middleware->alias([
            'staff' => EnsureActiveStaff::class,
            'subscriber' => EnsureActiveSubscriber::class,
            'permission' => PermissionMiddleware::class,
        ]);
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('portal*') ? '/portal/login' : '/login');
        $middleware->redirectUsersTo(fn (Request $request) => $request->is('portal*') ? '/portal' : '/admin');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Friendly error pages inside the app, while validation and local debugging keep their normal behaviour.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();
            // 403 and 404 are normal outcomes, so they stay friendly in debug mode. Real errors keep their stack trace there.
            $friendly = in_array($status, [403, 404], true) || (in_array($status, [500, 503], true) && ! app()->hasDebugModeEnabled());

            if ($friendly && ! $request->expectsJson() && ! $request->is('webhooks/*')) {
                return Inertia::render('error', ['status' => $status, 'contact' => SiteController::contactDetails()])->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
