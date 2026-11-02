import { Head, Link } from '@inertiajs/react';
import { Activity, AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, Clock, Inbox, PauseCircle, Receipt, Target, Ticket, TrendingUp, UserPlus, Users, Wallet, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, KpiTile, Page, StatusBadge } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { useShared } from '@/hooks/use-shared';
import { compactMoney, date, dateTime, initials, money } from '@/lib/format';

interface Named { name: string }
interface Props {
    money: boolean;
    customers: { total: number; active: number; suspended: number; new_this_month: number; by_status: Record<string, number> } | null;
    pipeline: Record<string, number> | null;
    installations: { pending: number; unconfirmed: number; upcoming: { id: string; reference: string; preferred_at: string; status: string; customer: Named; technician: Named | null }[] } | null;
    billing: {
        invoices_this_month: number; outstanding: string; overdue_amount: string; overdue_count: number; collected_this_month: string; mrr: string;
        upcoming_due: { id: string; number: string; due_date: string; balance: string; customer: Named }[];
        collections: { label: string; amount: number }[];
    } | null;
    tickets: { open: number; overdue: number; unassigned: number; recent: { id: string; number: string; subject: string; priority: string; status: string; customer: Named }[] } | null;
    followUps: number;
    activity: { id: string; description: string; created_at: string; user: Named | null }[];
}

const PIPELINE = [['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['converted', 'Converted']] as const;

export default function Dashboard({ customers, pipeline, installations, billing, tickets, followUps, activity }: Props) {
    const { auth } = useShared();
    const pipelineMax = Math.max(...PIPELINE.map(([k]) => pipeline?.[k] ?? 0), 1);
    const attention = [
        billing?.overdue_count ? { text: `${billing.overdue_count} overdue invoice${billing.overdue_count === 1 ? '' : 's'} · ${money(billing.overdue_amount)}`, href: '/admin/invoices?status=overdue', tone: 'bg-red-50 text-red-700' } : null,
        tickets?.overdue ? { text: `${tickets.overdue} ticket${tickets.overdue === 1 ? '' : 's'} past response target`, href: '/admin/tickets?status=active', tone: 'bg-red-50 text-red-700' } : null,
        tickets?.unassigned ? { text: `${tickets.unassigned} unassigned ticket${tickets.unassigned === 1 ? '' : 's'}`, href: '/admin/tickets?assigned_to=none', tone: 'bg-amber-50 text-amber-700' } : null,
        installations?.unconfirmed ? { text: `${installations.unconfirmed} installation${installations.unconfirmed === 1 ? '' : 's'} to confirm`, href: '/admin/installations?status=completed', tone: 'bg-amber-50 text-amber-700' } : null,
        followUps ? { text: `${followUps} lead follow-up${followUps === 1 ? '' : 's'} due`, href: '/admin/leads', tone: 'bg-blue-50 text-blue-700' } : null,
    ].filter(Boolean) as { text: string; href: string; tone: string }[];

    return (
        <Page>
            <Head title="Dashboard" />
            <PageHeader title="Dashboard" description={`Welcome back, ${auth?.user.name.split(' ')[0]}. Here's how things stand today.`} />

            {attention.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {attention.map((a) => (
                        <Link key={a.text} href={a.href} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 ${a.tone}`}>
                            <AlertTriangle className="h-3.5 w-3.5" />{a.text}<ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    ))}
                </div>
            )}

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {customers && <>
                    <KpiTile label="Total subscribers" value={customers.total} hint={`${customers.new_this_month} new this month`} href="/admin/customers" icon={Users} tint="blue" />
                    <KpiTile label="Active" value={customers.active} hint="With live service" href="/admin/customers?status=active" icon={CheckCircle2} tint="emerald" />
                    <KpiTile label="Suspended" value={customers.suspended} hint="Service on hold" href="/admin/customers?status=suspended" icon={PauseCircle} tint="red" />
                </>}
                {installations && <KpiTile label="Pending installations" value={installations.pending} hint={`${installations.unconfirmed} to confirm`} href="/admin/installations" icon={Wrench} tint="violet" />}
                {billing && <>
                    <KpiTile label="Collected this month" value={money(billing.collected_this_month)} hint="Confirmed payments" href="/admin/payments" icon={CircleDollarSign} tint="emerald" />
                    <KpiTile label="Outstanding balance" value={money(billing.outstanding)} hint={`${money(billing.overdue_amount)} overdue`} href="/admin/invoices" icon={Wallet} tint="amber" />
                    <KpiTile label="Monthly recurring" value={money(billing.mrr)} hint="From active subscriptions" href="/admin/subscriptions?status=active" icon={TrendingUp} tint="teal" />
                    <KpiTile label="Invoices this month" value={billing.invoices_this_month} hint="Excluding void" href="/admin/invoices" icon={Receipt} tint="indigo" />
                </>}
                {tickets && !billing && <>
                    <KpiTile label="Open tickets" value={tickets.open} href="/admin/tickets?status=active" icon={Ticket} tint="amber" />
                    <KpiTile label="Past target" value={tickets.overdue} href="/admin/tickets?status=active" icon={Clock} tint="red" />
                </>}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {billing && (
                    <Card title="Collections" subtitle="Confirmed payments over the last 6 months" icon={TrendingUp} tint="emerald" className="lg:col-span-2">
                        <div className="h-[240px]" role="img" aria-label="Monthly collections bar chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={billing.collections} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={compactMoney} width={60} />
                                    <Tooltip cursor={{ fill: 'rgba(15,23,42,.04)' }} formatter={(v) => [money(Number(v)), 'Collected']} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                                    <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={44} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {pipeline && (
                    <Card title="Lead pipeline" subtitle={`${followUps} follow-up${followUps === 1 ? '' : 's'} due`} icon={Target} tint="indigo" actions={<Link href="/admin/leads" className="text-xs font-medium text-primary hover:underline">Open</Link>}>
                        <ul className="space-y-3">
                            {PIPELINE.map(([key, label]) => {
                                const value = pipeline[key] ?? 0;
                                return (
                                    <li key={key}>
                                        <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{label}</span><span className="font-semibold tabular-nums">{value}</span></div>
                                        <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${value ? Math.max(4, (value / pipelineMax) * 100) : 0}%` }} /></div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}

                {tickets && (
                    <Card title="Tickets needing attention" subtitle={`${tickets.open} open · ${tickets.overdue} past target`} icon={Ticket} tint="amber" flush actions={<Link href="/admin/tickets" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
                        {tickets.recent.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No open tickets.</p> : (
                            <ul className="divide-y divide-border pb-2">
                                {tickets.recent.map((t) => (
                                    <li key={t.id}><Link href={`/admin/tickets/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-muted/50">
                                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{t.subject}</span><span className="block truncate text-xs text-muted-foreground">{t.customer.name} · {t.number}</span></span>
                                        <StatusBadge value={t.priority} />
                                    </Link></li>
                                ))}
                            </ul>
                        )}
                    </Card>
                )}

                {installations && (
                    <Card title="Upcoming installations" icon={CalendarClock} tint="violet" flush actions={<Link href="/admin/installations" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
                        {installations.upcoming.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing scheduled.</p> : (
                            <ul className="divide-y divide-border pb-2">
                                {installations.upcoming.map((j) => (
                                    <li key={j.id}><Link href={`/admin/installations/${j.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-muted/50">
                                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{j.customer.name}</span><span className="block truncate text-xs text-muted-foreground">{dateTime(j.preferred_at)} · {j.technician?.name ?? 'Unassigned'}</span></span>
                                        <StatusBadge value={j.status} />
                                    </Link></li>
                                ))}
                            </ul>
                        )}
                    </Card>
                )}

                {billing && (
                    <Card title="Upcoming due dates" icon={Inbox} tint="blue" flush actions={<Link href="/admin/invoices" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
                        {billing.upcoming_due.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing due soon.</p> : (
                            <ul className="divide-y divide-border pb-2">
                                {billing.upcoming_due.map((i) => (
                                    <li key={i.id}><Link href={`/admin/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-muted/50">
                                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{i.customer.name}</span><span className="block text-xs text-muted-foreground">Due {date(i.due_date)}</span></span>
                                        <span className="text-sm font-semibold tabular-nums">{money(i.balance)}</span>
                                    </Link></li>
                                ))}
                            </ul>
                        )}
                    </Card>
                )}

                {activity.length > 0 && (
                    <Card title="Recent activity" icon={Activity} tint="slate" className="lg:col-span-3" actions={<Link href="/admin/audit-trail" className="text-xs font-medium text-primary hover:underline">Audit trail</Link>}>
                        <ul className="space-y-3">
                            {activity.map((a) => (
                                <li key={a.id} className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{a.user ? initials(a.user.name) : <UserPlus className="h-4 w-4" />}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm">{a.description}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">{dateTime(a.created_at)}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
        </Page>
    );
}
