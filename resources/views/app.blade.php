<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" suppressHydrationWarning>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @isset($meta['description'])
            <meta name="description" content="{{ $meta['description'] }}">
            <meta property="og:title" content="{{ $meta['title'] }}">
            <meta property="og:description" content="{{ $meta['description'] }}">
        @endisset
        <script>
            window.__businessName = @json(\App\Support\Settings::get('business.name'));
            (function () {
                try {
                    var theme = localStorage.getItem('ispsystem.theme') || 'light';
                    if (!/^\/admin/.test(location.pathname)) document.documentElement.classList.add('site-theme');
                var themed = /^\/(admin|login|forgot-password|reset-password)/.test(location.pathname);
                    if (themed && theme === 'dark' || (themed && theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
                        document.documentElement.classList.add('dark');
                    }
                } catch (e) {}
            })();
        </script>
        <link rel="icon" href="/favicon.png" type="image/png">
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
            <title>{{ $meta['title'] ?? \App\Support\Settings::get('business.name') }}</title>
        </x-inertia::head>
    </head>
    <body>
        <x-inertia::app />
    </body>
</html>
