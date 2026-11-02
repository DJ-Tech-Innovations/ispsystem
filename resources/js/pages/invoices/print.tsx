import { Head } from '@inertiajs/react';
import { PrintDoc } from '@/components/app/PrintDoc';
import { date, money, titleCase } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function InvoicePrint({ invoice: i, company }: { invoice: any; company: any }) {
    return (
        <>
            <Head title={i.number} />
            <PrintDoc title="Invoice" number={i.number} company={company}>
                {i.status === 'void' && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">VOID · {i.void_reason}</p>}
                <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
                    <div><p className="text-xs font-semibold uppercase text-slate-500">Bill to</p><p className="font-semibold">{i.customer.name}</p><p>{i.customer.billing_address}</p><p>{i.customer.mobile}</p><p className="text-slate-500">{i.customer.reference}</p></div>
                    <dl className="space-y-1 text-right">
                        <div><dt className="inline text-slate-500">Issue date: </dt><dd className="inline">{date(i.issue_date)}</dd></div>
                        <div><dt className="inline text-slate-500">Due date: </dt><dd className="inline font-semibold">{date(i.due_date)}</dd></div>
                        {i.period_start && <div><dt className="inline text-slate-500">Period: </dt><dd className="inline">{date(i.period_start)} – {date(i.period_end)}</dd></div>}
                        <div><dt className="inline text-slate-500">Status: </dt><dd className="inline">{titleCase(i.status)}</dd></div>
                    </dl>
                </section>
                <table className="mt-6 w-full text-sm">
                    <thead><tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th></tr></thead>
                    <tbody>{i.items.map((item: any) => <tr key={item.id} className="border-b border-slate-100"><td className="py-2">{item.description}</td><td className="py-2 text-right">{Number(item.quantity)}</td><td className="py-2 text-right">{money(item.unit_price)}</td><td className="py-2 text-right">{money(item.amount)}</td></tr>)}</tbody>
                </table>
                <dl className="ml-auto mt-4 w-64 space-y-1 text-sm">
                    <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(i.subtotal)}</dd></div>
                    {Number(i.adjustment) !== 0 && <div className="flex justify-between"><dt>Adjustment</dt><dd>{money(i.adjustment)}</dd></div>}
                    {Number(i.tax) !== 0 && <div className="flex justify-between"><dt>{company.billing_tax_label} ({Number(company.billing_tax_rate)}%)</dt><dd>{money(i.tax)}</dd></div>}
                    <div className="flex justify-between border-t border-slate-300 pt-1 font-semibold"><dt>Total</dt><dd>{money(i.total)}</dd></div>
                    <div className="flex justify-between"><dt>Paid</dt><dd>{money(i.amount_paid)}</dd></div>
                    <div className="flex justify-between border-t-2 border-royal-950 pt-1 text-base font-bold"><dt>Balance due</dt><dd>{money(i.balance)}</dd></div>
                </dl>
                {i.notes && <p className="mt-8 whitespace-pre-wrap text-xs text-slate-500">{i.notes}</p>}
            </PrintDoc>
        </>
    );
}
