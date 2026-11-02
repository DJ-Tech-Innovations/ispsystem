import { Link, usePage } from '@inertiajs/react';
import {
    ArrowUpCircle, BarChart3, Bell, CalendarClock, CreditCard, Globe, History, LayoutDashboard, Mail, MapPinned, Megaphone, Receipt, Router, Settings, Shield, Target, Ticket, UserCog, Users, Wifi, Wrench, X, type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCan, useShared } from '@/hooks/use-shared';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface NavItem { title: string; path: string; icon: LucideIcon; permission: string; badge?: keyof SharedProps['counts']; }

const navSections: { label: string; items: NavItem[] }[] = [
    { label: 'Main Menu', items: [{ title: 'Dashboard', path: '/admin', icon: LayoutDashboard, permission: 'dashboard.view' }] },
    {
        label: 'CRM',
        items: [
            { title: 'Leads', path: '/admin/leads', icon: Target, permission: 'leads.view', badge: 'leads' },
            { title: 'Customers', path: '/admin/customers', icon: Users, permission: 'customers.view' },
            { title: 'Customer Map', path: '/admin/map', icon: MapPinned, permission: 'customers.map' },
        ],
    },
    {
        label: 'Services',
        items: [
            { title: 'Subscriptions', path: '/admin/subscriptions', icon: Wifi, permission: 'subscriptions.view' },
            { title: 'Plan Upgrades', path: '/admin/plan-upgrades', icon: ArrowUpCircle, permission: 'plan_changes.view', badge: 'planChanges' },
            { title: 'Service Plans', path: '/admin/plans', icon: Router, permission: 'plans.view' },
            { title: 'Installations', path: '/admin/installations', icon: Wrench, permission: 'installations.view', badge: 'installations' },
        ],
    },
    {
        label: 'Billing',
        items: [
            { title: 'Invoices', path: '/admin/invoices', icon: Receipt, permission: 'invoices.view', badge: 'overdue' },
            { title: 'Payments', path: '/admin/payments', icon: CreditCard, permission: 'payments.view' },
            { title: 'Billing Runs', path: '/admin/billing', icon: CalendarClock, permission: 'billing.view_runs' },
            { title: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'reports.view' },
        ],
    },
    { label: 'Support', items: [{ title: 'Tickets', path: '/admin/tickets', icon: Ticket, permission: 'tickets.view', badge: 'tickets' }] },
    {
        label: 'Communications',
        items: [
            { title: 'Website', path: '/admin/website', icon: Globe, permission: 'website.manage' },
            { title: 'Announcements', path: '/admin/announcements', icon: Megaphone, permission: 'announcements.view' },
            { title: 'Email Templates', path: '/admin/notification-templates', icon: Mail, permission: 'notifications.templates' },
            { title: 'Notification Log', path: '/admin/notifications', icon: Bell, permission: 'notifications.view' },
        ],
    },
    {
        label: 'Administration',
        items: [
            { title: 'Users', path: '/admin/users', icon: UserCog, permission: 'users.view' },
            { title: 'Roles', path: '/admin/roles', icon: Shield, permission: 'roles.manage' },
            { title: 'Audit Trail', path: '/admin/audit-trail', icon: History, permission: 'audit.view' },
            { title: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings.manage' },
        ],
    },
];

function SidebarLink({ item, badge, collapsed, onNavigate }: { item: NavItem; badge: number; collapsed: boolean; onNavigate?: () => void }) {
    const { url } = usePage();
    const path = url.split('?')[0];
    const isActive = item.path === '/admin' ? path === '/admin' : path === item.path || path.startsWith(`${item.path}/`);

    const link = (
        <Link
            href={item.path}
            onClick={onNavigate}
            aria-label={collapsed ? (badge > 0 ? `${item.title}, ${badge} need attention` : item.title) : undefined}
            className={cn(
                'group flex items-center rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                collapsed ? 'relative mx-auto h-11 w-12 justify-center' : 'gap-3 px-3 py-2.5',
                isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40' : 'text-blue-100/75 hover:bg-white/10 hover:text-white',
            )}
        >
            <item.icon className={cn('shrink-0 transition-colors', collapsed ? 'h-6 w-6' : 'h-[18px] w-[18px]', isActive ? 'text-white' : 'text-blue-300/70 group-hover:text-white')} />
            {!collapsed && <span className="flex-1">{item.title}</span>}
            {badge > 0 && (
                <span className={cn('flex items-center justify-center rounded-full bg-amber-500 font-semibold text-white', collapsed ? 'absolute right-0 top-0.5 h-[18px] min-w-[18px] px-1 text-[10px] leading-none ring-2 ring-blue-950' : 'h-5 min-w-5 px-1.5 text-[11px]')}>
                    {badge}
                </span>
            )}
        </Link>
    );

    if (!collapsed) return link;
    return (
        <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>{item.title}{badge > 0 ? ` · ${badge} need attention` : ''}</TooltipContent>
        </Tooltip>
    );
}

export function Sidebar({ onNavigate, onClose, collapsed = false }: { onNavigate?: () => void; onClose?: () => void; collapsed?: boolean }) {
    const { business, counts } = useShared();
    const can = useCan();
    const sections = navSections.map((s) => ({ ...s, items: s.items.filter((i) => can(i.permission)) })).filter((s) => s.items.length > 0);

    return (
        <div className="keep-light flex h-full flex-col bg-gradient-to-b from-blue-950 via-blue-950 to-slate-950 text-blue-100">
            <div className={cn('flex h-16 shrink-0 items-center border-b border-white/10', collapsed ? 'justify-center px-2' : 'justify-between gap-3 px-5')}>
                <Link href="/admin" onClick={onNavigate} className="flex min-w-0 items-center gap-3" aria-label={collapsed ? business.name : undefined}>
                    {business.mark ? (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg shadow-blue-900/50 ring-1 ring-white/20">
                            <img src={business.mark} alt={`${business.name} logo`} className="h-full w-full object-contain" />
                        </span>
                    ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-900/50 ring-1 ring-white/20">{initials(business.name)}</span>
                    )}
                    {!collapsed && (
                        <span className="min-w-0 leading-tight">
                            <span className="block max-w-[10.5rem] truncate text-base font-semibold tracking-tight text-white" title={business.name}>{business.name}</span>
                            <span className="block max-w-[10.5rem] truncate text-[11px] text-blue-300/70">{business.tagline || 'ISP Management System'}</span>
                        </span>
                    )}
                </Link>
                {onClose && (
                    <button type="button" onClick={onClose} className="rounded-md p-1.5 text-blue-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        <X className="h-5 w-5" /><span className="sr-only">Close navigation</span>
                    </button>
                )}
            </div>

            <TooltipProvider delayDuration={80} skipDelayDuration={300}>
                <nav aria-label="Main navigation" className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'space-y-1 px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'sidebar-scroll space-y-6 px-3 [scrollbar-gutter:stable]')}>
                    {sections.map((section, index) => (
                        <div key={section.label} className={cn(collapsed && index > 0 && 'border-t border-white/10 pt-1')}>
                            {!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300/60">{section.label}</p>}
                            <ul className="space-y-1">
                                {section.items.map((item) => (
                                    
                                        <li key={item.path}><SidebarLink item={item} badge={item.badge ? counts[item.badge] : 0} collapsed={collapsed} onNavigate={onNavigate} /></li>
                                    
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </TooltipProvider>

            {!collapsed && (
                <div className="shrink-0 border-t border-white/10 p-4">
                    <div className="rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
                        <p className="truncate text-xs font-medium text-white">{business.name}</p>
                        <p className="text-[11px] text-blue-300/70">ISP Management • v1.0</p>
                    </div>
                </div>
            )}
        </div>
    );
}
