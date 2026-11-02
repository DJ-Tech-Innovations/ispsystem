import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Receipt } from 'lucide-react';
import { EmptyState, SimplePager, StatusBadge } from '@/components/app/kit';
import { date, money } from '@/lib/format';
import type { Paginated } from '@/types';

interface Invoice { id: string; number: string; issue_date: string; due_date: string; total: string; balance: string; status: string }

export default function PortalInvoices({ invoices }: { invoices: Paginated<Invoice> }) {
    return (
        <>
            <Head title="Invoices" />
            <h1 className="mb-6 text-2xl font-bold tracking-tight">Invoices</h1>
            {invoices.total === 0 ? <EmptyState icon={<Receipt className="h-6 w-6" />} title="No invoices yet" description="Your invoices will appear here each month." /> : (
                <>
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
                        {invoices.data.map((i) => (
                            <li key={i.id}><Link href={`/portal/invoices/${i.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 sm:px-6">
                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{i.number}</span><span className="block text-xs text-muted-foreground">Due {date(i.due_date)}</span></span>
                                <span className="text-right"><span className="block text-sm font-semibold tabular-nums">{money(i.total)}</span><StatusBadge value={i.status} /></span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link></li>
                        ))}
                    </ul>
                    <SimplePager meta={invoices} />
                </>
            )}
        </>
    );
}
