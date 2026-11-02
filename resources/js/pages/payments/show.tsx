import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Download, Printer, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { Card, ConfirmAction, Detail, Page, StatusBadge } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { dateTime, money, titleCase } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PaymentShow({ payment: p }: { payment: any }) {
    const [reversing, setReversing] = useState(false);
    return (
        <Page>
            <Head title={p.reference} />
            <Link href="/admin/payments" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Payments</Link>
            <PageHeader title={p.reference} description={`${money(p.amount)} from ${p.customer.name}`} actions={<>
                <StatusBadge value={p.status} />
                <Button asChild variant="outline" className="bg-card"><a href={`/admin/payments/${p.id}/receipt`} target="_blank" rel="noreferrer"><Printer className="mr-2 h-4 w-4" />Receipt</a></Button>
                {p.status === 'confirmed' && <Can permission="payments.reverse"><Button variant="outline" className="bg-card text-destructive" onClick={() => setReversing(true)}><Undo2 className="mr-2 h-4 w-4" />Reverse</Button></Can>}
            </>} />
            {p.status === 'reversed' && <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Reversed {dateTime(p.reversed_at)} by {p.reverser?.name}. Reason: {p.reversal_reason}</div>}
            <Card className="max-w-3xl">
                <div className="grid gap-5 sm:grid-cols-3">
                    <Detail label="Customer"><Link href={`/admin/customers/${p.customer.id}`} className="text-primary hover:underline">{p.customer.name}</Link></Detail>
                    <Detail label="Invoice">{p.allocations.map((a: any) => <Link key={a.id} href={`/admin/invoices/${a.invoice.id}`} className="block text-primary hover:underline">{a.invoice.number}</Link>)}</Detail>
                    <Detail label="Amount">{money(p.amount)}</Detail>
                    <Detail label="Date">{dateTime(p.paid_at)}</Detail>
                    <Detail label="Method">{titleCase(p.method)}</Detail>
                    <Detail label="External reference">{p.external_reference}</Detail>
                    <Detail label="Received by">{p.receiver?.name}</Detail>
                    {p.proof_name && <Detail label="Proof of payment"><a href={`/admin/payments/${p.id}/proof`} className="inline-flex items-center gap-1.5 text-primary hover:underline"><Download className="h-3.5 w-3.5" />Download</a></Detail>}
                    {p.notes && <div className="sm:col-span-3"><Detail label="Notes"><span className="whitespace-pre-wrap font-normal">{p.notes}</span></Detail></div>}
                </div>
            </Card>
            <ConfirmAction open={reversing} onOpenChange={setReversing} title="Reverse this payment?" description="The invoice balance goes back up. The payment stays on record as reversed." url={`/admin/payments/${p.id}/reverse`} reason="Reason for reversal" confirmLabel="Reverse Payment" destructive />
        </Page>
    );
}
