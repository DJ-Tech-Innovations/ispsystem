import { Head } from '@inertiajs/react';
import { Plus, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { EmptyState, ExportButton, Filters, FilterSelect, Page, Pagination, RowLink, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { TicketForm } from '@/components/app/TicketForm';
import { Button } from '@/components/ui/button';
import { useCan, useShared } from '@/hooks/use-shared';
import { dateTime } from '@/lib/format';
import type { Paginated, Person } from '@/types';

interface TicketRow { id: string; number: string; subject: string; category: string; priority: string; status: string; due_at: string | null; created_at: string; customer: { name: string }; assignee: Person | null }

export default function TicketsIndex({ tickets, filters, staff }: { tickets: Paginated<TicketRow>; filters: Record<string, string>; staff: Person[] }) {
    const { enums } = useShared();
    const can = useCan();
    const apply = useFilters(filters);
    const [open, setOpen] = useState(false);
    const now = new Date().toISOString();
    const closed = ['resolved', 'closed'];

    return (
        <Page>
            <Head title="Tickets" />
            <PageHeader title="Tickets" description={can('tickets.view_all') ? 'Support requests, most urgent first' : 'Tickets assigned to you'} actions={<>
                <Can permission="tickets.export"><ExportButton href="/admin/tickets/export" /></Can>
                <Can permission="tickets.create"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New Ticket</Button></Can>
            </>} />
            {tickets.total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<Ticket className="h-6 w-6" />} title="No tickets" description="Support requests will show up here." />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search number, subject, customer..." />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={[{ value: 'active', label: 'All open' }, ...enums.ticketStatus]} all="All statuses" />
                        <FilterSelect value={filters.priority} onChange={(priority) => apply({ priority })} options={enums.ticketPriority} all="All priorities" />
                        <FilterSelect value={filters.category} onChange={(category) => apply({ category })} options={enums.ticketCategory} all="All categories" />
                        {can('tickets.view_all') && <FilterSelect value={filters.assigned_to} onChange={(assigned_to) => apply({ assigned_to })} options={[{ value: 'none', label: 'Unassigned' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} all="All staff" />}
                    </Filters>
                    <Table headers={['Ticket', 'Customer', 'Category', 'Assigned', 'Respond By', 'Priority', 'Status']} empty={tickets.data.length === 0}>
                        {tickets.data.map((t) => {
                            const late = t.due_at && t.due_at < now && !closed.includes(t.status);
                            return (
                                <Tr key={t.id}>
                                    <Td><RowLink href={`/admin/tickets/${t.id}`} sub={t.number}>{t.subject}</RowLink></Td>
                                    <Td muted><span className="whitespace-nowrap">{t.customer.name}</span></Td>
                                    <Td muted><span className="whitespace-nowrap">{enums.ticketCategory.find((c) => c.value === t.category)?.label}</span></Td>
                                    <Td muted><span className="whitespace-nowrap">{t.assignee?.name ?? 'Unassigned'}</span></Td>
                                    <Td muted><span className={`whitespace-nowrap ${late ? 'font-medium text-red-600' : ''}`}>{closed.includes(t.status) ? '—' : dateTime(t.due_at)}</span></Td>
                                    <Td><StatusBadge value={t.priority} /></Td>
                                    <Td><StatusBadge value={t.status} /></Td>
                                </Tr>
                            );
                        })}
                    </Table>
                    <Pagination meta={tickets} label="tickets" />
                </>
            )}
            <TicketForm open={open} onOpenChange={setOpen} staff={staff} />
        </Page>
    );
}
