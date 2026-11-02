import { Head } from '@inertiajs/react';
import { CreditCard } from 'lucide-react';
import { Can } from '@/components/app/Can';
import { EmptyState, ExportButton, Filters, FilterSelect, Page, Pagination, RowLink, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Input } from '@/components/ui/input';
import { useShared } from '@/hooks/use-shared';
import { dateTime, money, titleCase } from '@/lib/format';
import type { Paginated, Person } from '@/types';

interface Payment { id: string; reference: string; paid_at: string; amount: string; method: string; status: string; customer: { name: string }; receiver: Person | null; allocations: { invoice: { id: string; number: string } }[] }

export default function PaymentsIndex({ payments, filters }: { payments: Paginated<Payment>; filters: Record<string, string> }) {
    const { enums } = useShared();
    const apply = useFilters(filters);
    return (
        <Page>
            <Head title="Payments" />
            <PageHeader title="Payments" description="Record payments from an invoice. Confirmed payments can only be reversed, never edited." actions={<Can permission="payments.export"><ExportButton href="/admin/payments/export" /></Can>} />
            {payments.total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payments yet" description="Open an invoice and choose Record Payment." />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search reference or customer..." />
                        <FilterSelect value={filters.method} onChange={(method) => apply({ method })} options={enums.paymentMethod} all="All methods" />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={[{ value: 'confirmed', label: 'Confirmed' }, { value: 'reversed', label: 'Reversed' }]} all="All statuses" />
                        <Input aria-label="From" type="date" className="bg-card sm:w-40" value={filters.from ?? ''} onChange={(e) => apply({ from: e.target.value })} />
                        <Input aria-label="To" type="date" className="bg-card sm:w-40" value={filters.to ?? ''} onChange={(e) => apply({ to: e.target.value })} />
                    </Filters>
                    <Table headers={['Payment', 'Customer', 'Invoice', 'Date', 'Method', ['Amount', 'right'], 'Status']} empty={payments.data.length === 0}>
                        {payments.data.map((p) => (
                            <Tr key={p.id}>
                                <Td><RowLink href={`/admin/payments/${p.id}`} sub={p.receiver?.name}>{p.reference}</RowLink></Td>
                                <Td muted><span className="whitespace-nowrap">{p.customer.name}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{p.allocations.map((a) => a.invoice.number).join(', ')}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{dateTime(p.paid_at)}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{titleCase(p.method)}</span></Td>
                                <Td right><span className="font-medium">{money(p.amount)}</span></Td>
                                <Td><StatusBadge value={p.status} /></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={payments} label="payments" />
                </>
            )}
        </Page>
    );
}
