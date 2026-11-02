import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpCircle, Bell, ChevronRight, LogOut, Menu, Receipt, Target, Ticket, User as UserIcon, Wrench, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { QuickSearch } from '@/components/app/QuickSearch';
import { Sidebar } from '@/components/app/Sidebar';
import { SidebarToggle } from '@/components/app/SidebarToggle';
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { useFlashToasts, useShared } from '@/hooks/use-shared';
import { initials, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

function useBreadcrumbs() {
    const { url } = usePage();
    const parts = url.split('?')[0].split('/').filter(Boolean).slice(1);
    return parts.map((part, i) => {
        const isId = /^[0-9a-f-]{36}$/i.test(part);
        return { title: isId ? 'Details' : titleCase(part.replace(/-/g, ' ')), path: i < parts.length - 1 ? `/admin/${parts.slice(0, i + 1).join('/')}` : undefined };
    });
}

function NotificationsMenu() {
    const { counts } = useShared();
    const items: { key: string; title: string; path: string; icon: LucideIcon; tone: string }[] = [];
    if (counts.overdue) items.push({ key: 'overdue', title: `${counts.overdue} overdue invoice${counts.overdue === 1 ? '' : 's'}`, path: '/admin/invoices?status=overdue', icon: Receipt, tone: 'bg-red-50 text-red-600' });
    if (counts.tickets) items.push({ key: 'tickets', title: `${counts.tickets} open ticket${counts.tickets === 1 ? '' : 's'}`, path: '/admin/tickets?status=active', icon: Ticket, tone: 'bg-amber-50 text-amber-600' });
    if (counts.planChanges) items.push({ key: 'upgrades', title: `${counts.planChanges} upgrade request${counts.planChanges === 1 ? '' : 's'}`, path: '/admin/plan-upgrades', icon: ArrowUpCircle, tone: 'bg-blue-50 text-blue-600' });
    if (counts.leads) items.push({ key: 'leads', title: `${counts.leads} new lead${counts.leads === 1 ? '' : 's'}`, path: '/admin/leads', icon: Target, tone: 'bg-blue-50 text-blue-600' });
    if (counts.installations) items.push({ key: 'jobs', title: `${counts.installations} installation${counts.installations === 1 ? '' : 's'} in progress`, path: '/admin/installations', icon: Wrench, tone: 'bg-blue-50 text-blue-600' });
    const total = items.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Bell className="h-5 w-5" />
                    {total > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-card">{total}</span>}
                    <span className="sr-only">Notifications</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
                <p className="px-4 py-3 text-sm font-semibold">Needs attention</p>
                <DropdownMenuSeparator className="m-0" />
                {total === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</div> : (
                    <div className="py-1">
                        {items.map((n) => (
                            <DropdownMenuItem key={n.key} onSelect={() => router.visit(n.path)} className="mx-1 cursor-pointer gap-3 rounded-md px-3 py-2.5">
                                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.tone)}><n.icon className="h-4 w-4" /></span>
                                <span className="text-sm font-medium">{n.title}</span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function AccountMenu() {
    const { auth } = useShared();
    const name = auth?.user.name ?? 'Guest';
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" title={name} className="rounded-full p-0.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Avatar className="h-8 w-8"><AvatarFallback aria-hidden="true" className="bg-primary text-xs font-semibold text-primary-foreground">{initials(name)}</AvatarFallback></Avatar>
                    <span className="sr-only">Open account menu for {name}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{auth?.user.role}</p>
                    <p className="truncate text-xs text-muted-foreground">{auth?.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer"><Link href="/admin/account"><UserIcon className="mr-2 h-4 w-4" /> My Account</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600" onSelect={() => router.post('/logout')}><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function AppLayout({ children }: { children: ReactNode }) {
    const { business } = useShared();
    const { url } = usePage();
    const [mobileOpen, setMobileOpen] = useState(false);
    const crumbs = useBreadcrumbs();
    const { collapsed, toggle } = useSidebarCollapsed();

    useEffect(() => {
        setMobileOpen(false);
    }, [url]);

    useFlashToasts();

    return (
        <div className="min-h-screen bg-background">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-72 max-w-[85vw] border-none p-0 [&>button]:hidden">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <Sidebar onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
                </SheetContent>
            </Sheet>

            <aside className={cn('hidden transition-[width] duration-200 ease-out lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col print:!hidden', collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64')}>
                <Sidebar collapsed={collapsed} />
            </aside>

            <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200 ease-out print:!pl-0', collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64')}>
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6 lg:px-8 print:!hidden">
                    <button type="button" onClick={() => setMobileOpen(true)} className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden">
                        <Menu className="h-6 w-6" /><span className="sr-only">Open navigation</span>
                    </button>
                    <SidebarToggle collapsed={collapsed} onToggle={toggle} className="hidden lg:inline-flex" />
                    <div className="h-6 w-px bg-border" aria-hidden="true" />
                    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                        <ol className="flex items-center gap-1.5 text-sm">
                            <li className="hidden truncate sm:block"><Link href="/admin" className="text-muted-foreground hover:text-foreground">{business.name}</Link></li>
                            {(crumbs.length ? crumbs : [{ title: 'Dashboard', path: undefined }]).map((crumb, i) => (
                                <li key={i} className="flex min-w-0 items-center gap-1.5">
                                    <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 ${i === 0 ? 'hidden sm:block' : ''}`} />
                                    {crumb.path ? <Link href={crumb.path} className="truncate text-muted-foreground hover:text-foreground">{crumb.title}</Link> : <span className="truncate font-medium text-foreground">{crumb.title}</span>}
                                </li>
                            ))}
                        </ol>
                    </nav>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <QuickSearch />
                        <span className="hidden text-xs text-muted-foreground xl:inline">{new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}</span>
                        <div className="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />
                        <ThemeToggle />
                        <NotificationsMenu />
                        <AccountMenu />
                    </div>
                </header>
                <main className="flex-1"><div className="w-full">{children}</div></main>
            </div>
        </div>
    );
}
