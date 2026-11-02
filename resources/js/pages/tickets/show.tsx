import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, History, Lock, MessageSquare, Paperclip, Pencil, RotateCcw, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Can } from '@/components/app/Can';
import { Card, ConfirmAction, Detail, Field, Page, SelectField, StatusBadge, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { TicketForm } from '@/components/app/TicketForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCan, useShared } from '@/hooks/use-shared';
import { dateTime, initials, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Person } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
const NEXT: Record<string, string[]> = { open: ['in_progress', 'waiting_for_customer', 'resolved', 'closed'], in_progress: ['open', 'waiting_for_customer', 'resolved', 'closed'], waiting_for_customer: ['open', 'in_progress', 'resolved', 'closed'], resolved: ['closed'], closed: [] };

export default function TicketShow({ ticket: t, messages, staff, canReopen }: { ticket: any; messages: any[]; staff: Person[]; canReopen: boolean }) {
    const { enums } = useShared();
    const can = useCan();
    const [editing, setEditing] = useState(false);
    const [reopening, setReopening] = useState(false);
    const canNote = can('tickets.internal_notes');
    const canReply = can('tickets.reply');
    const reply = useForm<{ body: string; is_internal: boolean; files: File[] }>({ body: '', is_internal: !canReply && canNote, files: [] });
    const options = enums.ticketStatus.filter((o) => NEXT[t.status].includes(o.value));
    const status = useForm({ status: options[0]?.value ?? '', resolution_notes: t.resolution_notes ?? '' });
    const closed = ['resolved', 'closed'].includes(t.status);

    const send = (e: FormEvent) => {
        e.preventDefault();
        reply.post(`/admin/tickets/${t.id}/messages`, { preserveScroll: true, forceFormData: true, onSuccess: () => reply.reset('body', 'files') });
    };

    return (
        <Page>
            <Head title={t.number} />
            <Link href="/admin/tickets" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Tickets</Link>
            <PageHeader title={t.subject} description={`${t.number} · ${t.customer.name}`} actions={<>
                <StatusBadge value={t.priority} />
                <StatusBadge value={t.status} />
                {canReopen && <Can permission="tickets.update_status"><Button variant="outline" className="bg-card" onClick={() => setReopening(true)}><RotateCcw className="mr-2 h-4 w-4" />Reopen</Button></Can>}
                <Can permission="tickets.edit">{!closed && <Button variant="outline" className="bg-card" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}</Can>
            </>} />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card title="Conversation" icon={MessageSquare} tint="indigo">
                        <ul className="space-y-4">
                            <li className="rounded-xl bg-muted/50 p-4">
                                <p className="label-caps mb-1">Original request · {dateTime(t.created_at)}</p>
                                <p className="whitespace-pre-wrap text-sm">{t.description}</p>
                            </li>
                            {messages.map((m) => (
                                <li key={m.id} className={cn('flex gap-3 rounded-xl p-4', m.is_internal ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'bg-card ring-1 ring-inset ring-border')}>
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(m.user?.name ?? 'System')}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{m.user?.name ?? 'System'}{m.user?.type === 'subscriber' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Customer</span>}{m.is_internal && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><Lock className="h-3 w-3" />Internal</span>}<span className="text-xs font-normal text-muted-foreground">{dateTime(m.created_at)}</span></p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                                        {m.attachments.map((a: any) => <a key={a.id} href={`/admin/tickets/attachments/${a.id}`} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Paperclip className="h-3 w-3" />{a.original_name}</a>)}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {t.status !== 'closed' && (canReply || canNote) && (
                            <form onSubmit={send} className="mt-5 space-y-3 border-t border-border pt-5">
                                {canReply && canNote && (
                                    <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Message type">
                                        {[[false, 'Reply to customer'], [true, 'Internal note']].map(([value, label]) => (
                                            <button key={String(value)} type="button" aria-pressed={reply.data.is_internal === value} onClick={() => reply.setData('is_internal', value as boolean)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium', reply.data.is_internal === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>{label as string}</button>
                                        ))}
                                    </div>
                                )}
                                <Textarea aria-label="Message" rows={4} placeholder={reply.data.is_internal ? 'Only staff can see this note...' : 'The customer receives this by email...'} value={reply.data.body} onChange={(e) => reply.setData('body', e.target.value)} className={reply.data.is_internal ? 'bg-amber-50/60' : ''} />
                                {reply.errors.body && <p className="text-xs text-destructive">{reply.errors.body}</p>}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Input aria-label="Attachments" type="file" multiple className="sm:max-w-xs" onChange={(e) => reply.setData('files', Array.from(e.target.files ?? []))} />
                                    <SubmitButton type="submit" processing={reply.processing} disabled={reply.processing || !reply.data.body.trim()}><Send className="mr-2 h-4 w-4" />{reply.data.is_internal ? 'Add Note' : 'Send Reply'}</SubmitButton>
                                </div>
                            </form>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Details">
                        <div className="space-y-4">
                            <Detail label="Customer">{can('customers.view') ? <Link href={`/admin/customers/${t.customer.id}`} className="text-primary hover:underline">{t.customer.name}</Link> : t.customer.name}<span className="block text-xs font-normal text-muted-foreground">{t.customer.mobile}</span></Detail>
                            <Detail label="Service address">{t.customer.service_address}</Detail>
                            <Detail label="Received through">{titleCase(t.source)}</Detail>
                            <Detail label="Category">{enums.ticketCategory.find((c) => c.value === t.category)?.label}</Detail>
                            {t.subscription && <Detail label="Subscription">{t.subscription.reference} · {t.subscription.plan?.name}</Detail>}
                            <Detail label="Respond by">{dateTime(t.due_at)}</Detail>
                            <Detail label="First response">{dateTime(t.first_response_at)}</Detail>
                            {t.resolved_at && <Detail label="Resolved">{dateTime(t.resolved_at)}</Detail>}
                            {t.resolution_notes && <Detail label="Resolution"><span className="whitespace-pre-wrap font-normal">{t.resolution_notes}</span></Detail>}
                            {can('tickets.assign') ? (
                                <Field label="Assigned to"><SelectField value={t.assigned_to} none="Unassigned" onChange={(v) => router.put(`/admin/tickets/${t.id}/assign`, { assigned_to: v || null }, { preserveScroll: true })} options={staff.map((s) => ({ value: s.id, label: s.name }))} /></Field>
                            ) : <Detail label="Assigned to">{t.assignee?.name ?? 'Unassigned'}</Detail>}
                        </div>
                    </Card>
                    <Can permission="tickets.update_status">
                        {options.length > 0 && (
                            <Card title="Update status">
                                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); status.put(`/admin/tickets/${t.id}/status`, { preserveScroll: true }); }}>
                                    <SelectField value={status.data.status} onChange={(v) => status.setData('status', v)} options={options} />
                                    {status.errors.status && <p className="text-xs text-destructive">{status.errors.status}</p>}
                                    {status.data.status === 'resolved' && <Field label="Resolution notes" required error={status.errors.resolution_notes}><Textarea rows={3} value={status.data.resolution_notes} onChange={(e) => status.setData('resolution_notes', e.target.value)} /></Field>}
                                    <SubmitButton type="submit" size="sm" processing={status.processing}>Update</SubmitButton>
                                </form>
                            </Card>
                        )}
                    </Can>
                    <Card title="History" icon={History} tint="slate">
                        <ol className="space-y-3 border-l border-border pl-4">
                            {t.histories.map((h: any) => (
                                <li key={h.id} className="relative">
                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden="true" />
                                    <p className="text-sm font-medium">{titleCase(h.event)}{h.new_value ? `: ${h.old_value ? `${h.old_value} → ` : ''}${h.new_value}` : ''}</p>
                                    <p className="text-xs text-muted-foreground">{dateTime(h.created_at)}{h.user ? ` · ${h.user.name}` : ''}</p>
                                </li>
                            ))}
                        </ol>
                    </Card>
                </div>
            </div>
            <TicketForm open={editing} onOpenChange={setEditing} staff={staff} ticket={t} subscriptions={t.subscription ? [t.subscription] : []} />
            <ConfirmAction open={reopening} onOpenChange={setReopening} title="Reopen this ticket?" description="It returns to Open and the customer is told." url={`/admin/tickets/${t.id}/reopen`} confirmLabel="Reopen" />
        </Page>
    );
}
