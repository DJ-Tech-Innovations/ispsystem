import { Head, Link } from '@inertiajs/react';
import { FilePlus2, Receipt, TriangleAlert, Wallet } from 'lucide-react';
import { Can } from '@/components/app/Can';
import { EmptyState, ExportButton, Filters, FilterSelect, KpiTile, Page, Pagination, RowLink, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useShared } from '@/hooks/use-shared';
import { date, money } from '@/lib/format';
import type { Paginated } from '@/types';

interface Invoice { id: string; number: string; issue_date: string; due_date: string; total: string; balance: string; status: string; customer: { id: string; name: string } }
interface Props { invoices: Paginated<Invoice>; filters: Record<string, string>; totals: { outstanding: string; overdue: string; draft: number } }

export default function InvoicesIndex({ invoices, filters, totals }: Props) {
    const { enums } = useShared();
    const apply = useFilters(filters);

    return (
        <Page>
            <Head title="Invoices" />
            <PageHeader title="Invoices" description="Monthly billing and manual charges" actions={<>
                <Can permission="invoices.export"><ExportButton href="/admin/invoices/export" /></Can>
                <Can permission="invoices.create"><Button asChild><Link href="/admin/invoices/create"><FilePlus2 className="mr-2 h-4 w-4" />New Invoice</Link></Button></Can>
            </>} />
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <KpiTile label="Outstanding" value={money(totals.outstanding)} icon={Wallet} tint="amber" />
                <KpiTile label="Overdue" value={money(totals.overdue)} href="/admin/invoices?status=overdue" icon={TriangleAlert} tint="red" />
                <KpiTile label="Drafts to issue" value={totals.draft} href="/admin/invoices?status=draft" icon={Receipt} tint="slate" />
            </div>
            {invoices.total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<Receipt className="h-6 w-6" />} title="No invoices yet" description="Invoices are generated each day for active subscriptions that are due." />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search number or customer..." />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={enums.invoiceStatus} all="All statuses" />
                        <Input aria-label="Issued from" type="date" className="bg-card sm:w-40" value={filters.from ?? ''} onChange={(e) => apply({ from: e.target.value })} />
                        <Input aria-label="Issued to" type="date" className="bg-card sm:w-40" value={filters.to ?? ''} onChange={(e) => apply({ to: e.target.value })} />
                    </Filters>
                    <Table headers={['Invoice', 'Customer', 'Issued', 'Due', ['Total', 'right'], ['Balance', 'right'], 'Status']} empty={invoices.data.length === 0}>
                        {invoices.data.map((i) => (
                            <Tr key={i.id}>
                                <Td><RowLink href={`/admin/invoices/${i.id}`}>{i.number}</RowLink></Td>
                                <Td muted><span className="whitespace-nowrap">{i.customer.name}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{date(i.issue_date)}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{date(i.due_date)}</span></Td>
                                <Td right>{money(i.total)}</Td>
                                <Td right><span className="font-medium">{money(i.balance)}</span></Td>
                                <Td><StatusBadge value={i.status} /></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={invoices} label="invoices" />
                </>
            )}
        </Page>
    );
}
