import { Head, router } from '@inertiajs/react';
import { Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Can } from '@/components/app/Can';
import { CustomerForm } from '@/components/app/CustomerForm';
import { EmptyState, ExportButton, Filters, FilterSelect, Page, Pagination, RowLink, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useCan, useShared } from '@/hooks/use-shared';
import { date, initials, money } from '@/lib/format';
import type { Paginated } from '@/types';

interface Customer { id: string; reference: string; name: string; type: string; status: string; mobile: string; email: string | null; service_address: string; registered_on: string; subscriptions_count: number; outstanding: string | null }
interface Props { customers: Paginated<Customer>; filters: Record<string, string>; fromLead: { id: string; name: string; email: string | null; mobile: string | null; address: string | null } | null }

export default function CustomersIndex({ customers, filters, fromLead }: Props) {
    const { enums } = useShared();
    const can = useCan();
    const apply = useFilters(filters);
    const [open, setOpen] = useState(false);
    useEffect(() => { if (fromLead) setOpen(true); }, [fromLead]);
    const [first, ...rest] = (fromLead?.name ?? '').split(' ');
    const filtered = Object.values(filters).some(Boolean);

    return (
        <Page>
            <Head title="Customers" />
            <PageHeader title="Customers" description="Your subscriber directory" actions={<>
                <Can permission="customers.export"><ExportButton href="/admin/customers/export" /></Can>
                <Can permission="customers.create"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Register Customer</Button></Can>
            </>} />

            {customers.total === 0 && !filtered ? (
                <EmptyState icon={<Users className="h-6 w-6" />} title="No customers yet" description="Register your first subscriber to start tracking service and billing." action={can('customers.create') ? <Button onClick={() => setOpen(true)}>Register Customer</Button> : undefined} />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search, page: undefined })} placeholder="Search name, reference, mobile..." />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={enums.customerStatus} all="All statuses" />
                        <FilterSelect value={filters.type} onChange={(type) => apply({ type })} options={enums.customerType} all="All types" />
                        <FilterSelect value={filters.location} onChange={(location) => apply({ location })} options={[{ value: 'pinned', label: 'Pinned on map' }, { value: 'missing', label: 'No pin yet' }, { value: 'review', label: 'Pin needs checking' }]} all="All locations" />
                    </Filters>
                    <Table headers={['Customer', 'Mobile', 'Service Address', 'Subscriptions', ['Outstanding', 'right'], 'Registered', 'Status']} empty={customers.data.length === 0}>
                        {customers.data.map((c) => (
                            <Tr key={c.id}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{initials(c.name)}</span>
                                        <RowLink href={`/admin/customers/${c.id}`} sub={c.reference}>{c.name}</RowLink>
                                    </div>
                                </Td>
                                <Td muted><span className="whitespace-nowrap">{c.mobile}</span></Td>
                                <Td muted><span className="line-clamp-1 max-w-64">{c.service_address}</span></Td>
                                <Td muted>{c.subscriptions_count}</Td>
                                <Td right>{Number(c.outstanding) > 0 ? <span className="font-medium">{money(c.outstanding)}</span> : <span className="text-muted-foreground">—</span>}</Td>
                                <Td muted><span className="whitespace-nowrap">{date(c.registered_on)}</span></Td>
                                <Td><StatusBadge value={c.status} /></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={customers} label="customers" />
                </>
            )}

            <CustomerForm open={open} onOpenChange={(o) => { setOpen(o); if (!o && fromLead) router.get('/admin/customers', {}, { replace: true }); }} onSaved={() => setOpen(false)} leadId={fromLead?.id}
                initial={fromLead ? { first_name: first, last_name: rest.join(' '), email: fromLead.email ?? '', mobile: fromLead.mobile ?? '', service_address: fromLead.address ?? '' } : undefined} />
        </Page>
    );
}
