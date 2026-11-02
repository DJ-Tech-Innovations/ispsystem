import '../css/app.css';
import { createInertiaApp, router } from '@inertiajs/react';
import { apply, ThemeProvider } from '@/hooks/use-theme';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/AppLayout';
import PortalLayout from '@/layouts/PortalLayout';
import PublicLayout from '@/layouts/PublicLayout';

declare global {
    interface Window { __businessName?: string }
}

router.on('navigate', () => apply());

createInertiaApp({
    title: (title) => (title ? `${title} · ${window.__businessName}` : (window.__businessName ?? '')),
    layout: (name) => {
        if (name.startsWith('auth/') || name === 'portal/login' || name === 'error' || name.endsWith('/print') || name.endsWith('/receipt')) return null;
        if (name.startsWith('public/')) return PublicLayout;
        return name.startsWith('portal/') ? PortalLayout : AppLayout;
    },
    withApp(app) {
        return (
            <ThemeProvider>
                {app}
                <Toaster position="top-right" richColors />
            </ThemeProvider>
        );
    },
    progress: { color: '#2563eb' },
});
