import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CreditCard, FileText, KeyRound, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Receipt, Ticket, Trash2, Wifi, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { CustomerForm } from '@/components/app/CustomerForm';
import { LocationCard } from '@/components/app/LocationCard';
import { ConfirmAction, Card, Detail, Field, Page, RowLink, SelectField, StatusBadge, SubmitButton, Table, Td, Tr } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { SubscriptionForm } from '@/components/app/SubscriptionForm';
import { TicketForm } from '@/components/app/TicketForm';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCan, useShared } from '@/hooks/use-shared';
import { date, dateTime, initials, money, titleCase } from '@/lib/format';
import type { Person } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
    customer: any; subscriptions: any[]; invoices: any[]; payments: any[]; tickets: any[]; installations: any[]; interactions: any[]; history: any[];
    summary: { outstanding: string | null; paid_total: string | null; monthly: string | null };
    plans: { id: string; name: string; monthly_price: string; installation_fee: string }[]; staff: Person[];
}

export default function CustomerShow({ customer, subscriptions, invoices, payments, tickets, installations, interactions, history, summary, plans, staff }: Props) {
    const { enums, errors } = useShared();
    const can = useCan();
    const [editing, setEditing] = useState(false);
    const [newSub, setNewSub] = useState(false);
    const [newTicket, setNewTicket] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const portalLabel = !customer.user ? 'Not invited yet' : !customer.user.is_active ? 'Access revoked' : customer.user.last_login_at ? `Last signed in ${dateTime(customer.user.last_login_at)}` : 'Invited, not signed in yet';
    const note = useForm({ type: 'note', body: '' });
    const status = useForm({ status: customer.status, reason: '' });
    const prefs = customer.notification_preference ?? { email_enabled: true, sms_enabled: false };

    const timeline = [
        ...interactions.map((i) => ({ id: `i${i.id}`, at: i.created_at, title: titleCase(i.type), body: i.body, by: i.author?.name })),
        ...history.map((h) => ({ id: `h${h.id}`, at: h.created_at, title: h.old_status ? `${titleCase(h.old_status)} → ${titleCase(h.new_status)}` : titleCase(h.new_status), body: h.reason, by: h.actor?.name })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    const setPref = (key: string, value: boolean) => router.put(`/admin/customers/${customer.id}/preferences`, { email_enabled: prefs.email_enabled, sms_enabled: prefs.sms_enabled, [key]: value }, { preserveScroll: true });

    return (
        <Page>
            <Head title={customer.name} />
            <Link href="/admin/customers" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Customers</Link>
            <PageHeader
                image={<span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-semibold text-blue-700 sm:h-20 sm:w-20 sm:text-2xl">{initials(customer.name)}</span>}
                title={customer.name}
                description={`${customer.reference} · ${titleCase(customer.type)} · Since ${date(customer.registered_on)}`}
                actions={<>
                    <StatusBadge value={customer.status} />
                    <Can permission="tickets.create"><Button variant="outline" className="bg-card" onClick={() => setNewTicket(true)}><Ticket className="mr-2 h-4 w-4" />New Ticket</Button></Can>
                    <Can permission="subscriptions.create"><Button variant="outline" className="bg-card" onClick={() => setNewSub(true)}><Wifi className="mr-2 h-4 w-4" />New Subscription</Button></Can>
                    <Can permission="customers.edit"><Button onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button></Can>
                </>}
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                {summary.outstanding !== null && <div className="rounded-2xl bg-card p-5 shadow-card"><p className="label-caps">Outstanding</p><p className={`mt-1 text-2xl font-bold tabular-nums ${Number(summary.outstanding) > 0 ? 'text-red-600' : ''}`}>{money(summary.outstanding)}</p></div>}
                {summary.monthly !== null && <div className="rounded-2xl bg-card p-5 shadow-card"><p className="label-caps">Monthly recurring</p><p className="mt-1 text-2xl font-bold tabular-nums">{money(summary.monthly)}</p></div>}
                {summary.paid_total !== null && <div className="rounded-2xl bg-card p-5 shadow-card"><p className="label-caps">Lifetime paid</p><p className="mt-1 text-2xl font-bold tabular-nums">{money(summary.paid_total)}</p></div>}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Tabs defaultValue="subscriptions">
                        <TabsList className="h-auto flex-wrap justify-start bg-card shadow-card">
                            <TabsTrigger value="subscriptions"><Wifi className="mr-1.5 h-4 w-4" />Subscriptions</TabsTrigger>
                            {can('invoices.view') && <TabsTrigger value="invoices"><Receipt className="mr-1.5 h-4 w-4" />Invoices</TabsTrigger>}
                            {can('payments.view') && <TabsTrigger value="payments"><CreditCard className="mr-1.5 h-4 w-4" />Payments</TabsTrigger>}
                            <TabsTrigger value="tickets"><Ticket className="mr-1.5 h-4 w-4" />Tickets</TabsTrigger>
                            <TabsTrigger value="installations"><Wrench className="mr-1.5 h-4 w-4" />Installations</TabsTrigger>
                        </TabsList>
                        <TabsContent value="subscriptions">
                            <Table minWidth={560} headers={['Reference', 'Plan', ['Monthly', 'right'], 'Status']} empty={subscriptions.length === 0}>
                                {subscriptions.map((s) => <Tr key={s.id}><Td><RowLink href={`/admin/subscriptions/${s.id}`}>{s.reference}</RowLink></Td><Td muted>{s.plan?.name}</Td><Td right>{money(s.monthly_amount)}</Td><Td><StatusBadge value={s.status} /></Td></Tr>)}
                            </Table>
                        </TabsContent>
                        <TabsContent value="invoices">
                            <Table minWidth={560} headers={['Number', 'Due', ['Total', 'right'], ['Balance', 'right'], 'Status']} empty={invoices.length === 0}>
                                {invoices.map((i) => <Tr key={i.id}><Td><RowLink href={`/admin/invoices/${i.id}`}>{i.number}</RowLink></Td><Td muted>{date(i.due_date)}</Td><Td right>{money(i.total)}</Td><Td right>{money(i.balance)}</Td><Td><StatusBadge value={i.status} /></Td></Tr>)}
                            </Table>
                        </TabsContent>
                        <TabsContent value="payments">
                            <Table minWidth={560} headers={['Reference', 'Date', 'Method', ['Amount', 'right'], 'Status']} empty={payments.length === 0}>
                                {payments.map((p) => <Tr key={p.id}><Td><RowLink href={`/admin/payments/${p.id}`}>{p.reference}</RowLink></Td><Td muted>{date(p.paid_at)}</Td><Td muted>{titleCase(p.method)}</Td><Td right>{money(p.amount)}</Td><Td><StatusBadge value={p.status} /></Td></Tr>)}
                            </Table>
                        </TabsContent>
                        <TabsContent value="tickets">
                            <Table minWidth={560} headers={['Ticket', 'Assigned', 'Priority', 'Status']} empty={tickets.length === 0}>
                                {tickets.map((t) => <Tr key={t.id}><Td><RowLink href={`/admin/tickets/${t.id}`} sub={t.number}>{t.subject}</RowLink></Td><Td muted>{t.assignee?.name ?? '—'}</Td><Td><StatusBadge value={t.priority} /></Td><Td><StatusBadge value={t.status} /></Td></Tr>)}
                            </Table>
                        </TabsContent>
                        <TabsContent value="installations">
                            <Table minWidth={560} headers={['Reference', 'Schedule', 'Technician', 'Status']} empty={installations.length === 0}>
                                {installations.map((j) => <Tr key={j.id}><Td><RowLink href={`/admin/installations/${j.id}`}>{j.reference}</RowLink></Td><Td muted>{dateTime(j.preferred_at)}</Td><Td muted>{j.technician?.name ?? '—'}</Td><Td><StatusBadge value={j.status} /></Td></Tr>)}
                            </Table>
                        </TabsContent>
                    </Tabs>

                    <Card title="Timeline" subtitle="Interactions and status changes" icon={MessageSquare} tint="indigo">
                        <Can permission="customers.edit">
                            <form className="mb-5 space-y-2" onSubmit={(e) => { e.preventDefault(); note.post(`/admin/customers/${customer.id}/interactions`, { preserveScroll: true, onSuccess: () => note.reset('body') }); }}>
                                <Textarea aria-label="New interaction" rows={2} placeholder="Log a call, visit or note..." value={note.data.body} onChange={(e) => note.setData('body', e.target.value)} />
                                {note.errors.body && <p className="text-xs text-destructive">{note.errors.body}</p>}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="w-36"><SelectField value={note.data.type} onChange={(v) => note.setData('type', v)} options={enums.interactionType} /></div>
                                    <SubmitButton size="sm" type="submit" processing={note.processing} disabled={note.processing || !note.data.body.trim()}><Plus className="mr-1 h-3.5 w-3.5" />Log</SubmitButton>
                                </div>
                            </form>
                        </Can>
                        {timeline.length === 0 ? <p className="text-sm text-muted-foreground">Nothing logged yet.</p> : (
                            <ol className="space-y-4 border-l border-border pl-4">
                                {timeline.map((t) => (
                                    <li key={t.id} className="relative">
                                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden="true" />
                                        <p className="text-sm font-medium">{t.title}</p>
                                        {t.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>}
                                        <p className="mt-0.5 text-xs text-muted-foreground">{dateTime(t.at)}{t.by ? ` · ${t.by}` : ''}</p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Contact" icon={Phone}>
                        <ul className="space-y-3 text-sm">
                            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{customer.mobile}{customer.alternate_contact && <span className="block text-muted-foreground">{customer.alternate_contact}</span>}</span></li>
                            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="break-all">{customer.email ?? '—'}</span></li>
                            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{customer.service_address}{customer.landmark && <span className="block text-muted-foreground">{customer.landmark}</span>}</span></li>
                        </ul>
                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                            <Detail label="Billing address">{customer.billing_address}</Detail>
                            <Detail label="Registered by">{customer.creator?.name}</Detail>
                            {customer.account_notes && <Detail label="Account notes"><span className="whitespace-pre-wrap font-normal">{customer.account_notes}</span></Detail>}
                        </div>
                    </Card>
                    <LocationCard location={customer} updateUrl={`/admin/customers/${customer.id}/location`} clearable editable={can('customers.geotag')} taggedBy={customer.geo_tagger?.name} />
                    <Can permission="customers.edit">
                        <Card title="Notifications" subtitle="How this customer hears from you" icon={FileText} tint="slate">
                            <label className="flex items-center justify-between py-1 text-sm">Email<Switch checked={prefs.email_enabled} onCheckedChange={(v) => setPref('email_enabled', v)} /></label>
                            <label className="flex items-center justify-between py-1 text-sm">SMS<Switch checked={prefs.sms_enabled} onCheckedChange={(v) => setPref('sms_enabled', v)} /></label>
                        </Card>
                    </Can>
                    <Can permission="customers.portal">
                        <Card title="Customer portal" subtitle={portalLabel} icon={KeyRound} tint="teal">
                            {errors.portal && <p className="mb-2 text-xs text-destructive">{errors.portal}</p>}
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => router.post(`/admin/customers/${customer.id}/portal`, {}, { preserveScroll: true })}>{customer.user?.is_active ? 'Resend invitation' : customer.user ? 'Restore access' : 'Invite to portal'}</Button>
                                {customer.user?.is_active && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRevoking(true)}>Revoke access</Button>}
                            </div>
                        </Card>
                    </Can>
                    <Can permission="customers.change_status">
                        <Card title="Account status" subtitle="Normally follows the subscriptions">
                            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); status.put(`/admin/customers/${customer.id}/status`, { preserveScroll: true, onSuccess: () => status.reset('reason') }); }}>
                                <SelectField value={status.data.status} onChange={(v) => status.setData('status', v)} options={enums.customerStatus} />
                                <Field label="Reason" required error={status.errors.reason}><Textarea rows={2} value={status.data.reason} onChange={(e) => status.setData('reason', e.target.value)} /></Field>
                                <SubmitButton type="submit" size="sm" variant="outline" processing={status.processing} disabled={status.processing || status.data.status === customer.status}>Update status</SubmitButton>
                            </form>
                        </Card>
                    </Can>
                    <Can permission="customers.delete">
                        <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => setArchiving(true)}><Trash2 className="mr-2 h-4 w-4" />Archive customer</Button>
                    </Can>
                </div>
            </div>

            <CustomerForm open={editing} onOpenChange={setEditing} customerId={customer.id} initial={customer} />
            <SubscriptionForm open={newSub} onOpenChange={setNewSub} plans={plans} customer={customer} />
            <TicketForm open={newTicket} onOpenChange={setNewTicket} staff={staff} customer={customer} subscriptions={subscriptions} />
            <ConfirmAction open={revoking} onOpenChange={setRevoking} title="Revoke portal access?" description="The customer is signed out and can't sign in until you restore access." url={`/admin/customers/${customer.id}/portal`} method="delete" confirmLabel="Revoke" destructive />
            <ConfirmAction open={archiving} onOpenChange={setArchiving} title="Archive this customer?" description="Only customers with no service, billing or ticket records can be archived." url={`/admin/customers/${customer.id}`} method="delete" confirmLabel="Archive" destructive />
        </Page>
    );
}
