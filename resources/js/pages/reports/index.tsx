import { Head, Link } from '@inertiajs/react';
import { CircleDollarSign, Hourglass, Layers, Users } from 'lucide-react';
import { Card, KpiTile, Page, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Input } from '@/components/ui/input';
import { date, money } from '@/lib/format';

interface Row { count: number; total: number }
interface Props {
    filters: { from: string; to: string };
    collections: { total: number; count: number; by_method: (Row & { method: string })[]; by_staff: { name: string; count: number; total: string }[] };
    aging: (Row & { bucket: string })[];
    debtors: { customer_id: string; balance: string; invoices: number; oldest_due: string; customer: { id: string; name: string; reference: string } }[];
}

export default function ReportsIndex({ filters, collections, aging, debtors }: Props) {
    const apply = useFilters(filters);
    const agingTotal = aging.reduce((sum, a) => sum + a.total, 0);
    const methodMax = Math.max(...collections.by_method.map((m) => m.total), 1);
    const agingMax = Math.max(...aging.map((a) => a.total), 1);

    return (
        <Page>
            <Head title="Reports" />
            <PageHeader title="Reports" description="Collections and receivables" actions={<>
                <Input aria-label="From" type="date" className="w-full bg-card sm:w-40" value={filters.from} onChange={(e) => apply({ from: e.target.value })} />
                <Input aria-label="To" type="date" className="w-full bg-card sm:w-40" value={filters.to} onChange={(e) => apply({ to: e.target.value })} />
            </>} />
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <KpiTile label="Collected" value={money(collections.total)} hint={`${date(filters.from)} – ${date(filters.to)}`} icon={CircleDollarSign} tint="emerald" />
                <KpiTile label="Payments" value={collections.count} hint="Confirmed in this period" icon={Layers} tint="blue" />
                <KpiTile label="Receivables" value={money(agingTotal)} hint="All unpaid invoices today" icon={Hourglass} tint="amber" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Collections by method" icon={CircleDollarSign} tint="emerald">
                    {collections.by_method.length === 0 ? <p className="text-sm text-muted-foreground">No payments in this period.</p> : (
                        <ul className="space-y-3">
                            {collections.by_method.map((m) => (
                                <li key={m.method}>
                                    <div className="mb-1 flex justify-between gap-3 text-sm"><span>{m.method} <span className="text-xs text-muted-foreground">· {m.count}</span></span><span className="font-semibold tabular-nums">{money(m.total)}</span></div>
                                    <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, (m.total / methodMax) * 100)}%` }} /></div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card title="Receivables aging" subtitle="As of today, by days past due" icon={Hourglass} tint="amber">
                    <ul className="space-y-3">
                        {aging.map((a, i) => (
                            <li key={a.bucket}>
                                <div className="mb-1 flex justify-between gap-3 text-sm"><span>{a.bucket} <span className="text-xs text-muted-foreground">· {a.count}</span></span><span className="font-semibold tabular-nums">{money(a.total)}</span></div>
                                <div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.total ? Math.max(2, (a.total / agingMax) * 100) : 0}%` }} /></div>
                            </li>
                        ))}
                    </ul>
                </Card>
                <section className="min-w-0">
                    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Users className="h-4 w-4 text-muted-foreground" />Top outstanding balances</h2>
                    <Table minWidth={460} headers={['Customer', 'Invoices', 'Oldest Due', ['Balance', 'right']]} empty={debtors.length === 0}>
                        {debtors.map((d) => <Tr key={d.customer_id}><Td><Link href={`/admin/customers/${d.customer.id}`} className="font-medium hover:text-primary">{d.customer.name}</Link></Td><Td muted>{d.invoices}</Td><Td muted><span className="whitespace-nowrap">{date(d.oldest_due)}</span></Td><Td right><span className="font-medium">{money(d.balance)}</span></Td></Tr>)}
                    </Table>
                </section>
                <section className="min-w-0">
                    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Users className="h-4 w-4 text-muted-foreground" />Collected by staff</h2>
                    <Table minWidth={360} headers={['Staff', 'Payments', ['Collected', 'right']]} empty={collections.by_staff.length === 0}>
                        {collections.by_staff.map((s) => <Tr key={s.name}><Td>{s.name}</Td><Td muted>{s.count}</Td><Td right>{money(s.total)}</Td></Tr>)}
                    </Table>
                </section>
            </div>
        </Page>
    );
}
