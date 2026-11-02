import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { CustomerPicker, type PickedCustomer } from '@/components/app/CustomerPicker';
import { Card, Field, Page, SelectField, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { money, today } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Item { description: string; quantity: string; unit_price: string }

const addDays = (d: string, days: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + days); return x.toLocaleDateString('en-CA'); };

export default function InvoiceForm({ invoice, dueDays, taxRate }: { invoice: any | null; dueDays: number; taxRate: number }) {
    const issue = invoice?.issue_date ?? today();
    const [picked, setPicked] = useState<PickedCustomer | null>(null);
    const form = useForm({
        customer_id: invoice?.customer_id ?? '', subscription_id: invoice?.subscription_id ?? '', period_start: invoice?.period_start ?? '', period_end: invoice?.period_end ?? '',
        issue_date: issue, due_date: invoice?.due_date ?? addDays(issue, dueDays), adjustment: invoice?.adjustment ?? '0', notes: invoice?.notes ?? '',
        items: (invoice?.items?.map((i: any) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) ?? [{ description: '', quantity: '1', unit_price: '' }]) as Item[],
    });
    const errors = form.errors as Record<string, string>;

    const setItem = (index: number, key: keyof Item, value: string) => form.setData('items', form.data.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    const subtotal = form.data.items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
    const taxable = subtotal + Number(form.data.adjustment || 0);
    const tax = taxable * (taxRate / 100);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, subscription_id: d.subscription_id || null, period_start: d.period_start || null, period_end: d.period_end || null }));
        if (invoice) form.put(`/admin/invoices/${invoice.id}`); else form.post('/admin/invoices');
    };

    return (
        <Page>
            <Head title={invoice ? `Edit ${invoice.number}` : 'New Invoice'} />
            <Link href={invoice ? `/admin/invoices/${invoice.id}` : '/admin/invoices'} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
            <PageHeader title={invoice ? `Edit ${invoice.number}` : 'New Invoice'} description="Saved as a draft. Nothing reaches the customer until you issue it." />
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card title="Bill to">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Customer" required error={errors.customer_id} className="sm:col-span-2">
                                {invoice ? <Input disabled value={invoice.customer.name} /> : <CustomerPicker value={picked} onChange={(c) => { setPicked(c); form.setData((d) => ({ ...d, customer_id: c.id, subscription_id: '' })); }} />}
                            </Field>
                            {picked && picked.subscriptions.length > 0 && <Field label="Subscription" className="sm:col-span-2"><SelectField value={form.data.subscription_id} none="Not linked" onChange={(v) => form.setData('subscription_id', v)} options={picked.subscriptions.map((s) => ({ value: s.id, label: `${s.reference} · ${s.plan}` }))} /></Field>}
                            <Field label="Issue date" required error={errors.issue_date}><Input type="date" value={form.data.issue_date} onChange={(e) => form.setData('issue_date', e.target.value)} /></Field>
                            <Field label="Due date" required error={errors.due_date}><Input type="date" value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} /></Field>
                            <Field label="Billing period start" error={errors.period_start}><Input type="date" value={form.data.period_start} onChange={(e) => form.setData('period_start', e.target.value)} /></Field>
                            <Field label="Billing period end" error={errors.period_end}><Input type="date" value={form.data.period_end} onChange={(e) => form.setData('period_end', e.target.value)} /></Field>
                        </div>
                    </Card>
                    <Card title="Line items" actions={<Button type="button" size="sm" variant="outline" onClick={() => form.setData('items', [...form.data.items, { description: '', quantity: '1', unit_price: '' }])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Line</Button>}>
                        {errors.items && <p className="mb-2 text-xs text-destructive">{errors.items}</p>}
                        <div className="space-y-3">
                            {form.data.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_5rem_8rem_auto] sm:border-0 sm:p-0">
                                    <div className="col-span-2 sm:col-span-1"><Input aria-label="Description" placeholder="Description" value={item.description} onChange={(e) => setItem(i, 'description', e.target.value)} />{errors[`items.${i}.description`] && <p className="mt-1 text-xs text-destructive">{errors[`items.${i}.description`]}</p>}</div>
                                    <div><Input aria-label="Quantity" inputMode="decimal" placeholder="Qty" value={item.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />{errors[`items.${i}.quantity`] && <p className="mt-1 text-xs text-destructive">{errors[`items.${i}.quantity`]}</p>}</div>
                                    <div><Input aria-label="Unit price" inputMode="decimal" placeholder="Unit price" value={item.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} />{errors[`items.${i}.unit_price`] && <p className="mt-1 text-xs text-destructive">{errors[`items.${i}.unit_price`]}</p>}</div>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={form.data.items.length === 1} onClick={() => form.setData('items', form.data.items.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Notes"><Textarea aria-label="Notes" rows={3} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></Card>
                </div>
                <Card title="Summary" className="self-start lg:sticky lg:top-24">
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
                        <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Adjustment</dt><dd><Input aria-label="Adjustment" inputMode="decimal" className="h-8 w-28 text-right" value={form.data.adjustment} onChange={(e) => form.setData('adjustment', e.target.value)} /></dd></div>
                        {errors.adjustment && <p className="text-xs text-destructive">{errors.adjustment}</p>}
                        <p className="text-xs text-muted-foreground">Use a negative amount for a discount or proration.</p>
                        {taxRate > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Tax ({taxRate}%)</dt><dd className="tabular-nums">{money(tax)}</dd></div>}
                        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(taxable + tax)}</dd></div>
                    </dl>
                    <SubmitButton type="submit" className="mt-4 w-full" processing={form.processing}>{invoice ? 'Save Draft' : 'Save as Draft'}</SubmitButton>
                </Card>
            </form>
        </Page>
    );
}
