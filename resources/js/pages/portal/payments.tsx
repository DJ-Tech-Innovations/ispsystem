import { Head } from '@inertiajs/react';
import { CreditCard, Download } from 'lucide-react';
import { EmptyState, SimplePager, StatusBadge } from '@/components/app/kit';
import { date, money, titleCase } from '@/lib/format';
import type { Paginated } from '@/types';

interface Payment { id: string; reference: string; paid_at: string; amount: string; method: string; status: string; allocations: { invoice: { number: string } }[] }

export default function PortalPayments({ payments }: { payments: Paginated<Payment> }) {
    return (
        <>
            <Head title="Payments" />
            <h1 className="mb-6 text-2xl font-bold tracking-tight">Payment history</h1>
            {payments.total === 0 ? <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payments yet" description="Payments we receive from you will appear here." /> : (
                <>
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
                        {payments.data.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{date(p.paid_at)} · {titleCase(p.method)}</span><span className="block truncate text-xs text-muted-foreground">{p.reference} · {p.allocations.map((a) => a.invoice.number).join(', ')}</span></span>
                                <span className="text-right"><span className="block text-sm font-semibold tabular-nums">{money(p.amount)}</span>{p.status === 'reversed' && <StatusBadge value="reversed" />}</span>
                                <a href={`/portal/payments/${p.id}/receipt`} target="_blank" rel="noreferrer" aria-label={`Receipt ${p.reference}`} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Download className="h-4 w-4" /></a>
                            </li>
                        ))}
                    </ul>
                    <SimplePager meta={payments} />
                </>
            )}
        </>
    );
}
