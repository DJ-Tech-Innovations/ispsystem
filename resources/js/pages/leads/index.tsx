import { Head, Link, router, useForm } from '@inertiajs/react';
import { CalendarDays, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Target, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Can } from '@/components/app/Can';
import { ConfirmAction, EmptyState, ExportButton, Field, Filters, FilterSelect, Page, Pagination, SearchInput, SelectField, StatusBadge, SubmitButton, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCan, useShared } from '@/hooks/use-shared';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated, Person } from '@/types';

interface Lead {
    id: string; reference: string; name: string; email: string | null; mobile: string | null; address: string | null; source: string; status: string;
    service_plan_id: string | null; assigned_to: string | null; follow_up_on: string | null; notes: string | null; lost_reason: string | null; customer_id: string | null;
    plan: { name: string } | null; assignee: Person | null;
}
interface Props { view: 'board' | 'list'; leads: Paginated<Lead> | null; board: Lead[] | null; filters: Record<string, string>; plans: { id: string; name: string; monthly_price: string }[]; staff: Person[] }

const COLUMNS = [
    { key: 'new', label: 'New', bar: 'bg-blue-500' }, { key: 'contacted', label: 'Contacted', bar: 'bg-indigo-500' }, { key: 'qualified', label: 'Qualified', bar: 'bg-violet-500' },
    { key: 'converted', label: 'Converted', bar: 'bg-emerald-500' }, { key: 'lost', label: 'Lost', bar: 'bg-red-500' },
];

function LeadForm({ open, onOpenChange, lead, plans, staff }: { open: boolean; onOpenChange: (o: boolean) => void; lead: Lead | null; plans: Props['plans']; staff: Person[] }) {
    const { enums } = useShared();
    const blank = { name: '', email: '', mobile: '', address: '', source: 'walk_in', service_plan_id: '', assigned_to: '', follow_up_on: '', notes: '' };
    const form = useForm(blank);
    useEffect(() => {
        if (!open) return;
        form.setData(lead ? { name: lead.name, email: lead.email ?? '', mobile: lead.mobile ?? '', address: lead.address ?? '', source: lead.source, service_plan_id: lead.service_plan_id ?? '', assigned_to: lead.assigned_to ?? '', follow_up_on: lead.follow_up_on ?? '', notes: lead.notes ?? '' } : blank);
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, lead]);
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === '' ? null : v])) as typeof d);
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };
        if (lead) form.put(`/admin/leads/${lead.id}`, options); else form.post('/admin/leads', options);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-xl">
                <DialogHeader><DialogTitle>{lead ? 'Edit Lead' : 'Add Lead'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Name" required error={form.errors.name}><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Mobile" error={form.errors.mobile}><Input value={form.data.mobile} onChange={(e) => form.setData('mobile', e.target.value)} /></Field>
                        <Field label="Email" error={form.errors.email}><Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} /></Field>
                    </div>
                    <Field label="Address" error={form.errors.address}><Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Source" required error={form.errors.source}><SelectField value={form.data.source} onChange={(v) => form.setData('source', v)} options={enums.leadSource} /></Field>
                        <Field label="Interested plan"><SelectField value={form.data.service_plan_id} none="No plan yet" onChange={(v) => form.setData('service_plan_id', v)} options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${money(p.monthly_price)}` }))} /></Field>
                        <Field label="Assigned to"><SelectField value={form.data.assigned_to} none="Unassigned" onChange={(v) => form.setData('assigned_to', v)} options={staff.map((s) => ({ value: s.id, label: s.name }))} /></Field>
                        <Field label="Follow up on" error={form.errors.follow_up_on}><Input type="date" value={form.data.follow_up_on} onChange={(e) => form.setData('follow_up_on', e.target.value)} /></Field>
                    </div>
                    <Field label="Notes" error={form.errors.notes}><Textarea rows={3} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></Field>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <SubmitButton type="submit" processing={form.processing}>{lead ? 'Save Changes' : 'Add Lead'}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function LeadActions({ lead, onEdit, onDelete }: { lead: Lead; onEdit: () => void; onDelete: () => void }) {
    const can = useCan();
    if (lead.status === 'converted') return lead.customer_id ? <Link href={`/admin/customers/${lead.customer_id}`} className="text-xs font-medium text-primary hover:underline">View customer</Link> : null;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Actions for ${lead.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {can('leads.edit') && <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
                {can('leads.convert') && lead.status !== 'lost' && <DropdownMenuItem onSelect={() => router.post(`/admin/leads/${lead.id}/convert`)}><UserPlus className="mr-2 h-4 w-4" />Convert to customer</DropdownMenuItem>}
                {can('leads.delete') && <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={onDelete}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function LeadsIndex({ view, leads, board, filters, plans, staff }: Props) {
    const { enums } = useShared();
    const can = useCan();
    const apply = useFilters({ ...filters, view });
    const [editing, setEditing] = useState<Lead | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<Lead | null>(null);
    const [losing, setLosing] = useState<Lead | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const edit = (lead: Lead | null) => { setEditing(lead); setFormOpen(true); };
    const move = (lead: Lead, status: string) => {
        if (lead.status === status) return;
        if (status === 'converted') { if (can('leads.convert')) router.post(`/admin/leads/${lead.id}/convert`); return; }
        if (status === 'lost') { setLosing(lead); return; }
        router.put(`/admin/leads/${lead.id}/status`, { status }, { preserveScroll: true });
    };
    const drop = (e: DragEvent, status: string) => {
        e.preventDefault(); setDragOver(null);
        const lead = board?.find((l) => l.id === e.dataTransfer.getData('text/plain'));
        if (!lead) return;
        if (lead.status === 'converted') { toast.error('Converted leads stay in Converted.'); return; }
        move(lead, status);
    };
    const total = board?.length ?? leads?.total ?? 0;

    return (
        <Page>
            <Head title="Leads" />
            <PageHeader title="Leads" description="Website inquiries and walk-ins, from first contact to customer" actions={<>
                <div className="inline-flex rounded-lg bg-card p-1 shadow-card" role="group" aria-label="View">
                    {([['board', LayoutGrid, 'Board'], ['list', List, 'List']] as const).map(([key, Icon, label]) => (
                        <button key={key} type="button" aria-pressed={view === key} onClick={() => apply({ view: key })} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary', view === key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                            <Icon className="h-4 w-4" />{label}
                        </button>
                    ))}
                </div>
                <Can permission="leads.export"><ExportButton href="/admin/leads/export" /></Can>
                <Can permission="leads.create"><Button onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" />Add Lead</Button></Can>
            </>} />

            <Filters>
                <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search leads..." />
                <FilterSelect value={filters.source} onChange={(source) => apply({ source })} options={enums.leadSource} all="All sources" />
                <FilterSelect value={filters.assigned_to} onChange={(assigned_to) => apply({ assigned_to })} options={staff.map((s) => ({ value: s.id, label: s.name }))} all="All staff" />
                {view === 'list' && <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={enums.leadStatus} all="All statuses" />}
            </Filters>

            {total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<Target className="h-6 w-6" />} title="No leads yet" description="Inquiries from your website and walk-ins will appear here." action={can('leads.create') ? <Button onClick={() => edit(null)}>Add Lead</Button> : undefined} />
            ) : view === 'board' && board ? (
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                    {COLUMNS.map((column) => {
                        const cards = board.filter((l) => l.status === column.key);
                        return (
                            <section key={column.key} aria-label={column.label} onDragOver={(e) => { e.preventDefault(); setDragOver(column.key); }} onDragLeave={() => setDragOver(null)} onDrop={(e) => drop(e, column.key)}
                                className={cn('w-72 shrink-0 rounded-2xl bg-muted/60 p-3 transition-colors lg:min-w-0 lg:flex-1', dragOver === column.key && 'bg-blue-50 ring-2 ring-blue-300')}>
                                <header className="mb-3 flex items-center gap-2 px-1">
                                    <span className={cn('h-2.5 w-2.5 rounded-full', column.bar)} aria-hidden="true" />
                                    <h2 className="text-sm font-semibold">{column.label}</h2>
                                    <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{cards.length}</span>
                                </header>
                                <div className="min-h-24 space-y-2">
                                    {cards.map((lead) => (
                                        <article key={lead.id} draggable={can('leads.edit') && lead.status !== 'converted'} onDragStart={(e) => e.dataTransfer.setData('text/plain', lead.id)} className="rounded-xl bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="min-w-0 truncate text-sm font-semibold">{lead.name}</p>
                                                <LeadActions lead={lead} onEdit={() => edit(lead)} onDelete={() => setDeleting(lead)} />
                                            </div>
                                            <p className="text-xs text-muted-foreground">{lead.mobile ?? lead.email}</p>
                                            {lead.plan && <p className="mt-2 truncate text-xs font-medium text-primary">{lead.plan.name}</p>}
                                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                <span className="truncate">{enums.leadSource.find((s) => s.value === lead.source)?.label}</span>
                                                {lead.follow_up_on && !['converted', 'lost'].includes(lead.status) && <span className={cn('inline-flex shrink-0 items-center gap-1', lead.follow_up_on <= today && 'font-medium text-red-600')}><CalendarDays className="h-3 w-3" />{date(lead.follow_up_on).replace(/, \d{4}/, '')}</span>}
                                            </div>
                                            {/* Dragging needs a mouse, so the status is also a plain control on touch screens. */}
                                            {can('leads.edit') && lead.status !== 'converted' && (
                                                <select aria-label={`Move ${lead.name}`} value={lead.status} onChange={(e) => move(lead, e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs lg:hidden">
                                                    {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                                                </select>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : leads && (
                <>
                    <Table headers={['Lead', 'Contact', 'Source', 'Plan', 'Assigned', 'Follow Up', 'Status', ['Actions', 'right']]} empty={leads.data.length === 0}>
                        {leads.data.map((l) => (
                            <Tr key={l.id}>
                                <Td><span className="whitespace-nowrap font-medium">{l.name}</span><p className="text-xs text-muted-foreground">{l.reference}</p></Td>
                                <Td muted><span className="whitespace-nowrap">{l.mobile ?? '—'}</span><p className="text-xs">{l.email}</p></Td>
                                <Td muted>{enums.leadSource.find((s) => s.value === l.source)?.label}</Td>
                                <Td muted>{l.plan?.name ?? '—'}</Td>
                                <Td muted>{l.assignee?.name ?? '—'}</Td>
                                <Td muted><span className="whitespace-nowrap">{date(l.follow_up_on)}</span></Td>
                                <Td><StatusBadge value={l.status} /></Td>
                                <Td right><LeadActions lead={l} onEdit={() => edit(l)} onDelete={() => setDeleting(l)} /></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={leads} label="leads" />
                </>
            )}

            <LeadForm open={formOpen} onOpenChange={setFormOpen} lead={editing} plans={plans} staff={staff} />
            <ConfirmAction open={!!deleting} onOpenChange={() => setDeleting(null)} title="Delete this lead?" description={`${deleting?.name} will be removed permanently.`} url={`/admin/leads/${deleting?.id}`} method="delete" confirmLabel="Delete" destructive />
            <LostDialog lead={losing} onClose={() => setLosing(null)} />
        </Page>
    );
}

function LostDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
    const form = useForm({ status: 'lost', lost_reason: '' });
    useEffect(() => { form.setData('lost_reason', ''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lead]);
    return (
        <Dialog open={!!lead} onOpenChange={onClose}>
            <DialogContent className="rounded-3xl">
                <DialogHeader><DialogTitle>Mark {lead?.name} as lost</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); form.put(`/admin/leads/${lead?.id}/status`, { preserveScroll: true, onSuccess: onClose }); }} className="space-y-4">
                    <Field label="Reason" required error={form.errors.lost_reason}><Input autoFocus value={form.data.lost_reason} onChange={(e) => form.setData('lost_reason', e.target.value)} placeholder="Outside coverage area" /></Field>
                    <DialogFooter><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><SubmitButton type="submit" processing={form.processing}>Mark as lost</SubmitButton></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
