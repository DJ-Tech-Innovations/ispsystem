import { Head, Link } from '@inertiajs/react';
import { ArrowUpCircle, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { ConfirmAction, EmptyState, Filters, FilterSelect, Page, Pagination, RowLink, StatusBadge, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { date, dateTime, money } from '@/lib/format';
import type { Paginated, Person } from '@/types';

interface Change { id: string; reference: string; status: string; customer_id: string; current_amount: string; requested_amount: string; decision_reason: string | null; created_at: string; customer: { id: string; name: string }; subscription: { id: string; reference: string; next_billing_date: string | null }; from_plan: { name: string }; to_plan: { name: string; speed_description: string }; decider: Person | null }
const STATUSES = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']].map(([value, label]) => ({ value, label }));

export default function PlanChangesIndex({ changes, balances, filters }: { changes: Paginated<Change>; balances: Record<string, string>; filters: { status: string } }) {
    const apply = useFilters(filters);
    const [approving, setApproving] = useState<Change | null>(null);
    const [rejecting, setRejecting] = useState<Change | null>(null);

    return (
        <Page>
            <Head title="Plan Upgrades" />
            <PageHeader title="Plan Upgrades" description="Requests from subscribers in the customer portal" />
            <Filters><FilterSelect value={filters.status === 'all' ? undefined : filters.status} onChange={(status) => apply({ status: status ?? 'all' })} options={STATUSES} all="All statuses" /></Filters>
            {changes.total === 0 ? <EmptyState icon={<ArrowUpCircle className="h-6 w-6" />} title="Nothing here" description="Upgrade requests from customers will appear here." /> : (
                <>
                    <Table headers={['Customer', 'Change', ['Monthly', 'right'], ['Unpaid', 'right'], ['Decision', 'right']]} minWidth={760}>
                        {changes.data.map((c) => (
                            <Tr key={c.id}>
                                <Td><RowLink href={`/admin/customers/${c.customer.id}`} sub={<span className="whitespace-nowrap">{c.reference}</span>}>{c.customer.name}</RowLink></Td>
                                <Td><span className="whitespace-nowrap">{c.from_plan.name} → <strong className="font-semibold">{c.to_plan.name}</strong></span><p className="text-xs text-muted-foreground"><Link href={`/admin/subscriptions/${c.subscription.id}`} className="hover:text-primary">{c.subscription.reference}</Link> · {dateTime(c.created_at)}</p></Td>
                                <Td right><span className="whitespace-nowrap font-medium">{money(c.requested_amount)}</span><p className="whitespace-nowrap text-xs text-muted-foreground">from {money(c.current_amount)}, bill {date(c.subscription.next_billing_date)}</p></Td>
                                <Td right>{Number(balances[c.customer_id]) > 0 ? <span className="font-medium text-red-600">{money(balances[c.customer_id])}</span> : <span className="text-muted-foreground">—</span>}</Td>
                                <Td right>{c.status === 'pending' ? (
                                    <Can permission="plan_changes.approve">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" onClick={() => setApproving(c)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                                            <Button size="sm" variant="ghost" aria-label={`Reject ${c.reference}`} onClick={() => setRejecting(c)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </Can>
                                ) : <span title={c.decision_reason ?? undefined}><StatusBadge value={c.status === 'approved' ? 'confirmed' : c.status === 'rejected' ? 'failed' : c.status} label={STATUSES.find((x) => x.value === c.status)?.label} /><span className="block text-xs text-muted-foreground">{c.decider?.name}</span></span>}</Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={changes} label="requests" />
                </>
            )}
            <ConfirmAction open={!!approving} onOpenChange={() => setApproving(null)} title={`Approve ${approving?.to_plan.name} for ${approving?.customer.name}?`} description={`Their price becomes ${money(approving?.requested_amount)} from the next invoice, and they're told by email. This doesn't change the line speed: set ${approving?.to_plan.speed_description} on your network yourself.`} url={`/admin/plan-upgrades/${approving?.id}/approve`} confirmLabel="Approve" />
            <ConfirmAction open={!!rejecting} onOpenChange={() => setRejecting(null)} title="Reject this request?" description="The customer sees this reason by email and in the portal." url={`/admin/plan-upgrades/${rejecting?.id}/reject`} reason="Reason" confirmLabel="Reject" destructive />
        </Page>
    );
}
