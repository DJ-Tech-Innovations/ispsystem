import { Link, router, usePage } from '@inertiajs/react';
import { CreditCard, Home, LifeBuoy, LogOut, Receipt, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFlashToasts, useShared } from '@/hooks/use-shared';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Brand } from '@/layouts/PublicLayout';

const NAV: [string, string, LucideIcon][] = [['Home', '/portal', Home], ['Invoices', '/portal/invoices', Receipt], ['Payments', '/portal/payments', CreditCard], ['Support', '/portal/tickets', LifeBuoy], ['Account', '/portal/account', UserRound]];

/** A top bar on desktop and thumb-reach tabs on phones: customers mostly visit on a phone, for a minute at a time. */
export default function PortalLayout({ children }: { children: ReactNode }) {
    const { auth } = useShared();
    const { url } = usePage();
    const path = url.split('?')[0];
    const active = (href: string) => (href === '/portal' ? path === href : path.startsWith(href));
    useFlashToasts();
    const name = auth?.user.name ?? '';

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0 print:bg-white">
            <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Brand />
                    <nav aria-label="Portal" className="hidden items-center gap-1 md:flex">
                        {NAV.map(([label, href]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', active(href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>{label}</Link>)}
                    </nav>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" className="rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Avatar className="h-8 w-8"><AvatarFallback aria-hidden="true" className="bg-primary text-xs font-semibold text-primary-foreground">{initials(name)}</AvatarFallback></Avatar><span className="sr-only">Account menu</span></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="font-normal"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{auth?.user.email}</p></DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600" onSelect={() => router.post('/portal/logout')}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
            <nav aria-label="Portal tabs" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
                {NAV.map(([label, href, Icon]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active(href) ? 'text-ember-600' : 'text-muted-foreground')}><Icon className="h-5 w-5" />{label}</Link>)}
            </nav>
        </div>
    );
}
