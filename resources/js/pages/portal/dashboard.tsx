import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowUpCircle, CheckCircle2, LifeBuoy, Megaphone, Receipt, Wifi } from 'lucide-react';
import { Card, StatusBadge } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { date, money } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props { pendingUpgrades: string[]; firstName: string; reference: string; balance: string; overdue: string; nextDue: any | null; subscriptions: any[]; tickets: any[]; announcements: { id: string; title: string; body: string }[] }

export default function PortalDashboard({ pendingUpgrades, firstName, reference, balance, overdue, nextDue, subscriptions, tickets, announcements }: Props) {
    const owing = Number(balance) > 0;
    return (
        <>
            <Head title="My Account" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Account {reference}</p>

            {announcements.map((a) => <div key={a.id} className="mt-4 flex gap-2 rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-800"><Megaphone className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="font-semibold">{a.title}:</strong> {a.body}</span></div>)}

            <section className="keep-light mt-6 rounded-2xl bg-gradient-to-br from-royal-900 via-royal-700 to-royal-900 p-6 text-white shadow-card sm:p-8">
                <p className="text-sm text-royal-200">Balance due</p>
                <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{money(balance)}</p>
                {Number(overdue) > 0 ? <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ember-300"><AlertTriangle className="h-4 w-4" />{money(overdue)} is overdue</p>
                    : owing && nextDue ? <p className="mt-2 text-sm text-royal-100/80">Next due {date(nextDue.due_date)}</p>
                    : <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />You're all paid up</p>}
                {nextDue && <Button asChild className="mt-5 bg-white text-royal-950 hover:bg-royal-50"><Link href={`/portal/invoices/${nextDue.id}`}>View Invoice {nextDue.number}</Link></Button>}
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card title="My service" icon={Wifi}>
                    {subscriptions.length === 0 ? <p className="text-sm text-muted-foreground">No active service yet.</p> : (
                        <ul className="space-y-4">
                            {subscriptions.map((s) => (
                                <li key={s.id}>
                                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{s.plan?.name}</p><p className="text-sm text-primary">{s.plan?.speed_description}</p></div><StatusBadge value={s.status} /></div>
                                    <p className="mt-2 text-sm text-muted-foreground">{s.service_address}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{money(s.monthly_amount)} a month{s.next_billing_date ? ` · next bill ${date(s.next_billing_date)}` : ''}</p>
                                    {s.status === 'active' && <Button asChild size="sm" className="mt-3 bg-ember-500 font-semibold text-royal-950 hover:bg-ember-400"><Link href={`/portal/services/${s.id}/upgrade`}><ArrowUpCircle className="mr-1.5 h-4 w-4" />{pendingUpgrades.includes(s.id) ? 'Upgrade requested' : 'Upgrade Plan'}</Link></Button>}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card title="Support" icon={LifeBuoy} tint="amber" actions={<Link href="/portal/tickets" className="text-xs font-medium text-primary hover:underline">All tickets</Link>}>
                    {tickets.length === 0 ? <p className="text-sm text-muted-foreground">No open tickets. Everything looks good.</p> : (
                        <ul className="space-y-2">{tickets.map((t) => <li key={t.id}><Link href={`/portal/tickets/${t.id}`} className="flex items-center justify-between gap-3 rounded-lg py-1.5 hover:text-primary"><span className="min-w-0 truncate text-sm font-medium">{t.subject}</span><StatusBadge value={t.status} /></Link></li>)}</ul>
                    )}
                    <Button asChild variant="outline" className="mt-4 w-full"><Link href="/portal/tickets?new=1">Report a Problem</Link></Button>
                </Card>
            </div>
            <Link href="/portal/invoices" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><Receipt className="h-4 w-4" />See all invoices</Link>
        </>
    );
}
