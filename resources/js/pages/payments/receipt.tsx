import { Head } from '@inertiajs/react';
import { PrintDoc } from '@/components/app/PrintDoc';
import { dateTime, money, titleCase } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PaymentReceipt({ payment: p, company }: { payment: any; company: any }) {
    return (
        <>
            <Head title={`Receipt ${p.reference}`} />
            <PrintDoc title="Receipt" number={p.reference} company={company}>
                {p.status === 'reversed' && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">REVERSED · {p.reversal_reason}</p>}
                <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
                    <div><p className="text-xs font-semibold uppercase text-slate-500">Received from</p><p className="font-semibold">{p.customer.name}</p><p>{p.customer.billing_address}</p><p className="text-slate-500">{p.customer.reference}</p></div>
                    <dl className="space-y-1 text-right">
                        <div><dt className="inline text-slate-500">Date: </dt><dd className="inline">{dateTime(p.paid_at)}</dd></div>
                        <div><dt className="inline text-slate-500">Method: </dt><dd className="inline">{titleCase(p.method)}</dd></div>
                        {p.external_reference && <div><dt className="inline text-slate-500">Reference: </dt><dd className="inline">{p.external_reference}</dd></div>}
                        <div><dt className="inline text-slate-500">Received by: </dt><dd className="inline">{p.receiver?.name}</dd></div>
                    </dl>
                </section>
                <table className="mt-6 w-full text-sm">
                    <thead><tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500"><th className="py-2">Applied to invoice</th><th className="py-2 text-right">Amount</th></tr></thead>
                    <tbody>{p.allocations.map((a: any) => <tr key={a.id} className="border-b border-slate-100"><td className="py-2">{a.invoice.number}</td><td className="py-2 text-right">{money(a.amount)}</td></tr>)}</tbody>
                </table>
                <div className="ml-auto mt-4 flex w-64 justify-between border-t-2 border-royal-950 pt-2 text-base font-bold"><span>Amount paid</span><span>{money(p.amount)}</span></div>
                <p className="mt-10 text-center text-xs text-slate-500">Thank you for your payment. This is a system-generated acknowledgement receipt.</p>
            </PrintDoc>
        </>
    );
}
