import { Head, Link, router } from '@inertiajs/react';
import { Bell, RotateCw } from 'lucide-react';
import { Can } from '@/components/app/Can';
import { EmptyState, Filters, FilterSelect, Page, Pagination, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { dateTime, titleCase } from '@/lib/format';
import type { Paginated } from '@/types';

interface Log { id: string; event: string; channel: string; recipient: string; subject: string | null; status: string; attempts: number; error: string | null; created_at: string; customer: { id: string; name: string } | null }

export default function NotificationLogs({ logs, filters, events }: { logs: Paginated<Log>; filters: Record<string, string>; events: string[] }) {
    const apply = useFilters(filters);
    return (
        <Page>
            <Head title="Notification Log" />
            <PageHeader title="Notification Log" description="Every email and SMS the system has queued" />
            {logs.total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<Bell className="h-6 w-6" />} title="Nothing sent yet" description="Messages appear here as soon as they're queued." />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search recipient or subject..." />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={['queued', 'sent', 'failed'].map((v) => ({ value: v, label: titleCase(v) }))} all="All statuses" />
                        <FilterSelect value={filters.event} onChange={(event) => apply({ event })} options={events.map((v) => ({ value: v, label: titleCase(v) }))} all="All events" className="sm:w-56" />
                    </Filters>
                    <Table headers={['Message', 'Recipient', 'Customer', 'Queued', 'Status', ['', 'right']]} empty={logs.data.length === 0}>
                        {logs.data.map((l) => (
                            <Tr key={l.id}>
                                <Td><span className="line-clamp-1 max-w-72 font-medium">{l.subject ?? titleCase(l.event)}</span><p className="text-xs text-muted-foreground">{titleCase(l.event)} · {l.channel}</p></Td>
                                <Td muted>{l.recipient}</Td>
                                <Td muted>{l.customer ? <Link href={`/admin/customers/${l.customer.id}`} className="whitespace-nowrap hover:text-primary">{l.customer.name}</Link> : '—'}</Td>
                                <Td muted><span className="whitespace-nowrap">{dateTime(l.created_at)}</span></Td>
                                <Td><span title={l.error ?? undefined}><StatusBadge value={l.status} /></span></Td>
                                <Td right>{l.status === 'failed' && <Can permission="notifications.retry"><Button variant="ghost" size="sm" onClick={() => router.post(`/admin/notifications/${l.id}/retry`, {}, { preserveScroll: true })}><RotateCw className="mr-1.5 h-3.5 w-3.5" />Retry</Button></Can>}</Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={logs} label="messages" />
                </>
            )}
        </Page>
    );
}
