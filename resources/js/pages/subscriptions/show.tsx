import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, History, Pause, Pencil, Play, Plus, Receipt, Wifi, Wrench, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { InstallationForm } from '@/components/app/InstallationForm';
import { Card, ConfirmAction, Detail, Page, RowLink, StatusBadge, Table, Td, Tr } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { SubscriptionForm } from '@/components/app/SubscriptionForm';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-shared';
import { date, dateTime, money, titleCase } from '@/lib/format';
import type { Person } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props { subscription: any; installations: any[]; invoices: any[]; canActivate: boolean; plans: any[]; technicians: Person[] }
type Action = { status: string; title: string; description: string; label: string; reason?: string; destructive?: boolean };

export default function SubscriptionShow({ subscription: s, installations, invoices, canActivate, plans, technicians }: Props) {
    const can = useCan();
    const [editing, setEditing] = useState(false);
    const [newJob, setNewJob] = useState(false);
    const [action, setAction] = useState<Action | null>(null);

    const historyLabel = (h: any) => h.type === 'plan' ? `Plan: ${h.old_value} → ${h.new_value}` : h.type === 'price' ? `Price: ${money(h.old_value)} → ${money(h.new_value)}` : h.old_value ? `${titleCase(h.old_value)} → ${titleCase(h.new_value)}` : titleCase(h.new_value);
    const pre = ['pending', 'for_installation'].includes(s.status);

    return (
        <Page>
            <Head title={s.reference} />
            <Link href="/admin/subscriptions" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Subscriptions</Link>
            <PageHeader title={s.reference} description={`${s.plan.name} · ${s.plan.speed_description}`} actions={<>
                <StatusBadge value={s.status} />
                <Can permission="subscriptions.edit">{!['cancelled', 'terminated'].includes(s.status) && <Button variant="outline" className="bg-card" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}</Can>
                {can('subscriptions.activate') && (pre || s.status === 'suspended') && (
                    <Button disabled={pre && !canActivate} title={pre && !canActivate ? 'Confirm a completed installation first' : undefined}
                        onClick={() => setAction({ status: 'active', title: s.status === 'suspended' ? 'Reconnect this subscription?' : 'Activate this subscription?', description: s.status === 'suspended' ? 'Service resumes and billing continues.' : 'Billing starts on the billing start date.', label: s.status === 'suspended' ? 'Reconnect' : 'Activate' })}>
                        <Play className="mr-2 h-4 w-4" />{s.status === 'suspended' ? 'Reconnect' : 'Activate'}
                    </Button>
                )}
                {can('subscriptions.suspend') && s.status === 'active' && <Button variant="outline" className="bg-card" onClick={() => setAction({ status: 'suspended', title: 'Suspend this subscription?', description: 'The customer is told by email. Billing during suspension follows your Settings.', label: 'Suspend', reason: 'Reason for suspension', destructive: true })}><Pause className="mr-2 h-4 w-4" />Suspend</Button>}
                {can('subscriptions.terminate') && ['active', 'suspended'].includes(s.status) && <Button variant="outline" className="bg-card text-destructive" onClick={() => setAction({ status: 'terminated', title: 'Terminate this subscription?', description: "This can't be undone, and no more invoices will be generated.", label: 'Terminate', reason: 'Reason for termination', destructive: true })}><XCircle className="mr-2 h-4 w-4" />Terminate</Button>}
                {can('subscriptions.terminate') && pre && <Button variant="outline" className="bg-card text-destructive" onClick={() => setAction({ status: 'cancelled', title: 'Cancel this subscription?', description: "This can't be undone.", label: 'Cancel subscription', reason: 'Reason for cancelling', destructive: true })}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}
            </>} />

            {s.pending_change_count > 0 && <Link href="/admin/plan-upgrades" className="mb-6 block rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:underline">The customer has an upgrade request waiting.</Link>}
            {pre && !canActivate && (
                <div className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700"><Wrench className="h-4 w-4 shrink-0" />A completed installation must be confirmed before this subscription can be activated.</div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card title="Service details" icon={Wifi}>
                        <div className="grid gap-5 sm:grid-cols-3">
                            <Detail label="Customer"><Link href={`/admin/customers/${s.customer.id}`} className="text-primary hover:underline">{s.customer.name}</Link></Detail>
                            <Detail label="Agreed monthly">{money(s.monthly_amount)}</Detail>
                            <Detail label="Plan list price">{money(s.plan.monthly_price)}</Detail>
                            <Detail label="Installation fee">{money(s.installation_fee)}</Detail>
                            <Detail label="Deposit">{money(s.deposit)}</Detail>
                            <Detail label="Activated">{date(s.activated_on)}</Detail>
                            <Detail label="Billing start">{date(s.billing_start_date)}</Detail>
                            <Detail label="Billing day">{s.billing_day ?? 'Start-date anniversary'}</Detail>
                            <Detail label="Next billing">{date(s.next_billing_date)}</Detail>
                            <div className="sm:col-span-3"><Detail label="Service address">{s.service_address}</Detail></div>
                            {s.notes && <div className="sm:col-span-3"><Detail label="Internal notes"><span className="whitespace-pre-wrap font-normal">{s.notes}</span></Detail></div>}
                        </div>
                    </Card>

                    <section>
                        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold"><Wrench className="h-4 w-4 text-muted-foreground" />Installations</h2><Can permission="installations.create">{pre && <Button size="sm" onClick={() => setNewJob(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New Job</Button>}</Can></div>
                        <Table minWidth={520} headers={['Reference', 'Schedule', 'Technician', 'Status', 'Confirmed']} empty={installations.length === 0}>
                            {installations.map((j) => <Tr key={j.id}><Td><RowLink href={`/admin/installations/${j.id}`}>{j.reference}</RowLink></Td><Td muted>{dateTime(j.preferred_at)}</Td><Td muted>{j.technician?.name ?? '—'}</Td><Td><StatusBadge value={j.status} /></Td><Td>{j.confirmed_at ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Confirmed" /> : <span className="text-muted-foreground">—</span>}</Td></Tr>)}
                        </Table>
                    </section>

                    {can('invoices.view') && (
                        <section>
                            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Receipt className="h-4 w-4 text-muted-foreground" />Invoices</h2>
                            <Table minWidth={520} headers={['Number', 'Period', ['Total', 'right'], ['Balance', 'right'], 'Status']} empty={invoices.length === 0}>
                                {invoices.map((i) => <Tr key={i.id}><Td><RowLink href={`/admin/invoices/${i.id}`}>{i.number}</RowLink></Td><Td muted><span className="whitespace-nowrap">{date(i.period_start)}</span></Td><Td right>{money(i.total)}</Td><Td right>{money(i.balance)}</Td><Td><StatusBadge value={i.status} /></Td></Tr>)}
                            </Table>
                        </section>
                    )}
                </div>
                <Card title="History" icon={History} tint="slate" className="self-start">
                    <ol className="space-y-4 border-l border-border pl-4">
                        {s.histories.map((h: any) => (
                            <li key={h.id} className="relative">
                                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden="true" />
                                <p className="text-sm font-medium">{historyLabel(h)}</p>
                                {h.reason && <p className="text-sm text-muted-foreground">{h.reason}</p>}
                                <p className="mt-0.5 text-xs text-muted-foreground">{dateTime(h.created_at)}{h.actor ? ` · ${h.actor.name}` : ''}</p>
                            </li>
                        ))}
                    </ol>
                </Card>
            </div>

            <SubscriptionForm open={editing} onOpenChange={setEditing} plans={plans} subscription={s} />
            <InstallationForm open={newJob} onOpenChange={setNewJob} technicians={technicians} subscriptionId={s.id} address={s.service_address} />
            <ConfirmAction open={!!action} onOpenChange={() => setAction(null)} title={action?.title ?? ''} description={action?.description ?? ''} url={`/admin/subscriptions/${s.id}/status`} method="put" reason={action?.reason} confirmLabel={action?.label} destructive={action?.destructive} data={{ status: action?.status }} />
        </Page>
    );
}
