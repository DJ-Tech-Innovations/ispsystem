import { Head } from '@inertiajs/react';
import { CheckCircle2, Plus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { InstallationForm } from '@/components/app/InstallationForm';
import { EmptyState, Filters, FilterSelect, Page, Pagination, RowLink, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useCan, useShared } from '@/hooks/use-shared';
import { dateTime } from '@/lib/format';
import type { Paginated, Person } from '@/types';

interface Job { id: string; reference: string; address: string; preferred_at: string | null; status: string; confirmed_at: string | null; customer: { name: string; mobile: string }; technician: Person | null }
interface Props { jobs: Paginated<Job>; filters: Record<string, string>; technicians: Person[]; awaiting: { id: string; reference: string; service_address: string; customer: { name: string } }[] }

export default function InstallationsIndex({ jobs, filters, technicians, awaiting }: Props) {
    const { enums } = useShared();
    const can = useCan();
    const apply = useFilters(filters);
    const [open, setOpen] = useState(false);

    return (
        <Page>
            <Head title="Installations" />
            <PageHeader title="Installations" description={can('installations.view_all') ? 'Schedule jobs and track them to completion' : 'Jobs assigned to you'} actions={<Can permission="installations.create"><Button onClick={() => setOpen(true)} disabled={awaiting.length === 0} title={awaiting.length === 0 ? 'No subscriptions are waiting for a job' : undefined}><Plus className="mr-2 h-4 w-4" />New Job</Button></Can>} />
            {jobs.total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<Wrench className="h-6 w-6" />} title="No installation jobs" description={can('installations.view_all') ? 'Jobs appear here once you schedule a subscription for installation.' : 'Nothing is assigned to you right now.'} />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search reference, customer, address..." />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={enums.installationStatus} all="All statuses" />
                        {can('installations.view_all') && <FilterSelect value={filters.technician} onChange={(technician) => apply({ technician })} options={technicians.map((t) => ({ value: t.id, label: t.name }))} all="All technicians" />}
                    </Filters>
                    <Table headers={['Job', 'Customer', 'Address', 'Schedule', 'Technician', 'Status']} empty={jobs.data.length === 0}>
                        {jobs.data.map((j) => (
                            <Tr key={j.id}>
                                <Td><RowLink href={`/admin/installations/${j.id}`}>{j.reference}</RowLink></Td>
                                <Td><span className="whitespace-nowrap">{j.customer.name}</span><p className="text-xs text-muted-foreground">{j.customer.mobile}</p></Td>
                                <Td muted><span className="line-clamp-1 max-w-56">{j.address}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{dateTime(j.preferred_at)}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{j.technician?.name ?? 'Unassigned'}</span></Td>
                                <Td><span className="inline-flex items-center gap-1.5"><StatusBadge value={j.status} />{j.confirmed_at && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Confirmed" />}</span></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={jobs} label="jobs" />
                </>
            )}
            <InstallationForm open={open} onOpenChange={setOpen} technicians={technicians} subscriptions={awaiting.map((s) => ({ value: s.id, label: `${s.customer.name} · ${s.reference}`, address: s.service_address }))} />
        </Page>
    );
}
