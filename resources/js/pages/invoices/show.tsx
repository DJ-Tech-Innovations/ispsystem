import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Ban, CreditCard, Pencil, Printer, Send } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { Card, ConfirmAction, Detail, Page, RowLink, StatusBadge, Table, Td, Tr } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { PaymentDialog } from '@/components/app/PaymentDialog';
import { Button } from '@/components/ui/button';
import { date, dateTime, money, titleCase } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function InvoiceShow({ invoice: i }: { invoice: any }) {
    const [paying, setPaying] = useState(false);
    const [voiding, setVoiding] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const collectible = ['unpaid', 'partially_paid', 'overdue'].includes(i.status);

    return (
        <Page>
            <Head title={i.number} />
            <Link href="/admin/invoices" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Invoices</Link>
            <PageHeader title={i.number} description={i.customer.name} actions={<>
                <StatusBadge value={i.status} />
                <Button asChild variant="outline" className="bg-card"><a href={`/admin/invoices/${i.id}/print`} target="_blank" rel="noreferrer"><Printer className="mr-2 h-4 w-4" />Print</a></Button>
                {i.status === 'draft' && <Can permission="invoices.adjust">
                    <Button asChild variant="outline" className="bg-card"><Link href={`/admin/invoices/${i.id}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link></Button>
                    <Button onClick={() => setIssuing(true)}><Send className="mr-2 h-4 w-4" />Issue</Button>
                </Can>}
                {collectible && <Can permission="payments.create"><Button onClick={() => setPaying(true)}><CreditCard className="mr-2 h-4 w-4" />Record Payment</Button></Can>}
                {i.status !== 'void' && Number(i.amount_paid) === 0 && <Can permission="invoices.void"><Button variant="outline" className="bg-card text-destructive" onClick={() => setVoiding(true)}><Ban className="mr-2 h-4 w-4" />Void</Button></Can>}
            </>} />

            {i.status === 'void' && <div className="mb-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">Voided {dateTime(i.voided_at)}. Reason: {i.void_reason}</div>}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card title="Details">
                        <div className="grid gap-5 sm:grid-cols-3">
                            <Detail label="Customer"><Link href={`/admin/customers/${i.customer.id}`} className="text-primary hover:underline">{i.customer.name}</Link></Detail>
                            <Detail label="Subscription">{i.subscription ? <Link href={`/admin/subscriptions/${i.subscription.id}`} className="text-primary hover:underline">{i.subscription.reference}</Link> : '—'}</Detail>
                            <Detail label="Billing period">{i.period_start ? `${date(i.period_start)} – ${date(i.period_end)}` : '—'}</Detail>
                            <Detail label="Issued">{date(i.issue_date)}</Detail>
                            <Detail label="Due">{date(i.due_date)}</Detail>
                        </div>
                    </Card>
                    <Table minWidth={520} headers={['Description', ['Qty', 'right'], ['Unit Price', 'right'], ['Amount', 'right']]}>
                        {i.items.map((item: any) => <Tr key={item.id}><Td>{item.description}</Td><Td right muted>{Number(item.quantity)}</Td><Td right muted>{money(item.unit_price)}</Td><Td right>{money(item.amount)}</Td></Tr>)}
                    </Table>
                    {i.notes && <Card title="Notes"><p className="whitespace-pre-wrap text-sm text-muted-foreground">{i.notes}</p></Card>}
                    <section>
                        <h2 className="mb-3 text-base font-semibold">Payments</h2>
                        <Table minWidth={520} headers={['Reference', 'Date', 'Method', 'Received By', ['Amount', 'right'], 'Status']} empty={i.allocations.length === 0}>
                            {i.allocations.map((a: any) => <Tr key={a.id}><Td><RowLink href={`/admin/payments/${a.payment.id}`}>{a.payment.reference}</RowLink></Td><Td muted><span className="whitespace-nowrap">{date(a.payment.paid_at)}</span></Td><Td muted>{titleCase(a.payment.method)}</Td><Td muted>{a.payment.receiver?.name ?? '—'}</Td><Td right>{money(a.amount)}</Td><Td><StatusBadge value={a.payment.status} /></Td></Tr>)}
                        </Table>
                    </section>
                </div>
                <Card title="Summary" className="self-start">
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(i.subtotal)}</dd></div>
                        {Number(i.adjustment) !== 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Adjustment</dt><dd className="tabular-nums">{money(i.adjustment)}</dd></div>}
                        {Number(i.tax) !== 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular-nums">{money(i.tax)}</dd></div>}
                        <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(i.total)}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd className="tabular-nums">{money(i.amount_paid)}</dd></div>
                        <div className="flex justify-between border-t border-border pt-2 text-lg font-bold"><dt>Balance</dt><dd className="tabular-nums">{money(i.balance)}</dd></div>
                    </dl>
                </Card>
            </div>

            <PaymentDialog open={paying} onOpenChange={setPaying} invoice={i} />
            <ConfirmAction open={issuing} onOpenChange={setIssuing} title="Issue this invoice?" description="It becomes final and the customer is notified by email." url={`/admin/invoices/${i.id}/issue`} confirmLabel="Issue Invoice" />
            <ConfirmAction open={voiding} onOpenChange={setVoiding} title="Void this invoice?" description="Voided invoices stay on record but are no longer collectible." url={`/admin/invoices/${i.id}/void`} reason="Reason for voiding" confirmLabel="Void Invoice" destructive />
        </Page>
    );
}
