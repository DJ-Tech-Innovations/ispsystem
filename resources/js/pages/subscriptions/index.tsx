import { Head } from '@inertiajs/react';
import { Plus, Wifi } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { EmptyState, ExportButton, Filters, FilterSelect, Page, Pagination, RowLink, SearchInput, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { SubscriptionForm } from '@/components/app/SubscriptionForm';
import { Button } from '@/components/ui/button';
import { useCan, useShared } from '@/hooks/use-shared';
import { date, money } from '@/lib/format';
import type { Paginated } from '@/types';

interface Subscription { id: string; reference: string; status: string; monthly_amount: string; next_billing_date: string | null; activated_on: string | null; customer: { id: string; name: string }; plan: { name: string } }
interface Props { subscriptions: Paginated<Subscription>; filters: Record<string, string>; plans: { id: string; name: string; monthly_price: string; installation_fee: string; is_active: boolean }[] }

export default function SubscriptionsIndex({ subscriptions, filters, plans }: Props) {
    const { enums } = useShared();
    const can = useCan();
    const apply = useFilters(filters);
    const [open, setOpen] = useState(false);

    return (
        <Page>
            <Head title="Subscriptions" />
            <PageHeader title="Subscriptions" description="Service agreements between customers and plans" actions={<>
                <Can permission="subscriptions.export"><ExportButton href="/admin/subscriptions/export" /></Can>
                <Can permission="subscriptions.create"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New Subscription</Button></Can>
            </>} />
            {subscriptions.total === 0 && !Object.values(filters).some(Boolean) ? (
                <EmptyState icon={<Wifi className="h-6 w-6" />} title="No subscriptions yet" description="Create one from a customer's profile, or here." action={can('subscriptions.create') ? <Button onClick={() => setOpen(true)}>New Subscription</Button> : undefined} />
            ) : (
                <>
                    <Filters>
                        <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search reference, customer, address..." />
                        <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={enums.subscriptionStatus} all="All statuses" />
                        <FilterSelect value={filters.plan} onChange={(plan) => apply({ plan })} options={plans.map((p) => ({ value: p.id, label: p.name }))} all="All plans" />
                    </Filters>
                    <Table headers={['Subscription', 'Customer', 'Plan', ['Monthly', 'right'], 'Activated', 'Next Billing', 'Status']} empty={subscriptions.data.length === 0}>
                        {subscriptions.data.map((s) => (
                            <Tr key={s.id}>
                                <Td><RowLink href={`/admin/subscriptions/${s.id}`}>{s.reference}</RowLink></Td>
                                <Td muted><span className="whitespace-nowrap">{s.customer.name}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{s.plan.name}</span></Td>
                                <Td right>{money(s.monthly_amount)}</Td>
                                <Td muted><span className="whitespace-nowrap">{date(s.activated_on)}</span></Td>
                                <Td muted><span className="whitespace-nowrap">{date(s.next_billing_date)}</span></Td>
                                <Td><StatusBadge value={s.status} /></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={subscriptions} label="subscriptions" />
                </>
            )}
            <SubscriptionForm open={open} onOpenChange={setOpen} plans={plans.filter((p) => p.is_active)} />
        </Page>
    );
}
