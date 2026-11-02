import { useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import { CustomerPicker, type PickedCustomer } from '@/components/app/CustomerPicker';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/lib/format';

interface Plan { id: string; name: string; monthly_price: string; installation_fee: string }
export interface SubscriptionValues { id: string; service_plan_id: string; service_address: string; billing_start_date: string | null; billing_day: number | null; monthly_amount: string; installation_fee: string; deposit: string; notes: string | null }

export function SubscriptionForm({ open, onOpenChange, plans, customer, subscription }: { open: boolean; onOpenChange: (o: boolean) => void; plans: Plan[]; customer?: { id: string; name: string; reference: string; service_address: string } | null; subscription?: SubscriptionValues }) {
    const blank = { customer_id: customer?.id ?? '', service_plan_id: '', service_address: customer?.service_address ?? '', billing_start_date: '', billing_day: '', monthly_amount: '', installation_fee: '', deposit: '', notes: '', change_reason: '' };
    const form = useForm(blank);
    const [picked, setPicked] = useState<PickedCustomer | null>(null);

    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        setPicked(null);
        form.setData(subscription ? {
            ...blank, service_plan_id: subscription.service_plan_id, service_address: subscription.service_address, billing_start_date: subscription.billing_start_date ?? '',
            billing_day: subscription.billing_day ? String(subscription.billing_day) : '', monthly_amount: subscription.monthly_amount, installation_fee: subscription.installation_fee, deposit: subscription.deposit, notes: subscription.notes ?? '',
        } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const pickPlan = (id: string) => {
        const plan = plans.find((p) => p.id === id);
        // A new subscription takes the plan's prices. On an edit, the agreed price only changes if staff type a new one.
        form.setData((d) => ({ ...d, service_plan_id: id, ...(!subscription && plan ? { monthly_amount: plan.monthly_price, installation_fee: plan.installation_fee } : {}) }));
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, billing_start_date: d.billing_start_date || null, billing_day: d.billing_day || null, deposit: d.deposit || null }));
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };
        if (subscription) form.put(`/admin/subscriptions/${subscription.id}`, options); else form.post('/admin/subscriptions', options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-xl">
                <DialogHeader><DialogTitle>{subscription ? 'Edit Subscription' : 'New Subscription'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    {!subscription && (
                        <Field label="Customer" required error={form.errors.customer_id}>
                            {customer ? <Input value={`${customer.name} (${customer.reference})`} disabled /> : (
                                <CustomerPicker value={picked} onChange={(c) => { setPicked(c); form.setData((d) => ({ ...d, customer_id: c.id, service_address: c.service_address })); }} />
                            )}
                        </Field>
                    )}
                    <Field label="Service plan" required error={form.errors.service_plan_id}><SelectField value={form.data.service_plan_id} onChange={pickPlan} placeholder="Choose a plan" options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${money(p.monthly_price)}` }))} /></Field>
                    <Field label="Service address" required error={form.errors.service_address}><Input value={form.data.service_address} onChange={(e) => form.setData('service_address', e.target.value)} /></Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Agreed monthly" required error={form.errors.monthly_amount}><Input inputMode="decimal" value={form.data.monthly_amount} onChange={(e) => form.setData('monthly_amount', e.target.value)} /></Field>
                        <Field label="Installation fee" required error={form.errors.installation_fee}><Input inputMode="decimal" value={form.data.installation_fee} onChange={(e) => form.setData('installation_fee', e.target.value)} /></Field>
                        <Field label="Deposit" error={form.errors.deposit}><Input inputMode="decimal" value={form.data.deposit} onChange={(e) => form.setData('deposit', e.target.value)} /></Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Billing start date" error={form.errors.billing_start_date} hint="Blank means the activation date."><Input type="date" value={form.data.billing_start_date} onChange={(e) => form.setData('billing_start_date', e.target.value)} /></Field>
                        <Field label="Billing day" error={form.errors.billing_day} hint="1 to 31. Blank uses the start date."><Input type="number" min={1} max={31} value={form.data.billing_day} onChange={(e) => form.setData('billing_day', e.target.value)} /></Field>
                    </div>
                    {subscription && <Field label="Reason for change" error={form.errors.change_reason} hint="Kept in the history if the plan or price changes."><Input value={form.data.change_reason} onChange={(e) => form.setData('change_reason', e.target.value)} /></Field>}
                    <Field label="Internal notes" error={form.errors.notes}><Textarea rows={2} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></Field>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <SubmitButton type="submit" processing={form.processing}>{subscription ? 'Save Changes' : 'Create Subscription'}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
