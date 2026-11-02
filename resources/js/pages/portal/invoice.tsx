import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Card, Detail, StatusBadge } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { date, money, titleCase } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PortalInvoice({ invoice: i, items, payments }: { invoice: any; items: any[]; payments: any[] }) {
    return (
        <>
            <Head title={i.number} />
            <Link href="/portal/invoices" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to invoices</Link>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div><h1 className="text-2xl font-bold tracking-tight">{i.number}</h1><div className="mt-1"><StatusBadge value={i.status} /></div></div>
                <Button asChild variant="outline" className="bg-card"><a href={`/portal/invoices/${i.id}/print`} target="_blank" rel="noreferrer"><Printer className="mr-2 h-4 w-4" />Print or Download</a></Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card>
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                            <Detail label="Issued">{date(i.issue_date)}</Detail>
                            <Detail label="Due">{date(i.due_date)}</Detail>
                            {i.period_start && <Detail label="Period">{date(i.period_start)} – {date(i.period_end)}</Detail>}
                        </div>
                    </Card>
                    <Card title="Charges">
                        <ul className="divide-y divide-border">{items.map((item) => <li key={item.id} className="flex justify-between gap-4 py-2.5 text-sm"><span className="min-w-0">{item.description}</span><span className="shrink-0 tabular-nums">{money(item.amount)}</span></li>)}</ul>
                    </Card>
                    {payments.length > 0 && (
                        <Card title="Payments">
                            <ul className="divide-y divide-border">
                                {payments.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                                        <span className="min-w-0"><a href={`/portal/payments/${a.payment.id}/receipt`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{a.payment.reference}</a><span className="block text-xs text-muted-foreground">{date(a.payment.paid_at)} · {titleCase(a.payment.method)}</span></span>
                                        <span className="shrink-0 text-right tabular-nums">{money(a.amount)}{a.payment.status === 'reversed' && <span className="block"><StatusBadge value="reversed" /></span>}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {i.notes && <Card title="Notes"><p className="whitespace-pre-wrap text-sm text-muted-foreground">{i.notes}</p></Card>}
                </div>
                <Card title="Summary" className="self-start">
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(i.subtotal)}</dd></div>
                        {Number(i.adjustment) !== 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Adjustment</dt><dd className="tabular-nums">{money(i.adjustment)}</dd></div>}
                        {Number(i.tax) !== 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular-nums">{money(i.tax)}</dd></div>}
                        <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd className="tabular-nums">{money(i.amount_paid)}</dd></div>
                        <div className="flex justify-between border-t border-border pt-2 text-lg font-bold"><dt>Balance</dt><dd className="tabular-nums">{money(i.balance)}</dd></div>
                    </dl>
                </Card>
            </div>
        </>
    );
}
