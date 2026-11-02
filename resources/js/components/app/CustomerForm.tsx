import { useForm } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useShared } from '@/hooks/use-shared';

export interface CustomerFormValues {
    type: string; first_name: string; last_name: string; organization_name: string; email: string; mobile: string; alternate_contact: string;
    billing_address: string; service_address: string; landmark: string; account_notes: string;
}
const EMPTY: CustomerFormValues = { type: 'residential', first_name: '', last_name: '', organization_name: '', email: '', mobile: '', alternate_contact: '', billing_address: '', service_address: '', landmark: '', account_notes: '' };

export function CustomerForm({ open, onOpenChange, onSaved, customerId, initial, leadId }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved?: () => void; customerId?: string; initial?: Partial<CustomerFormValues>; leadId?: string }) {
    const { enums } = useShared();
    const form = useForm({ ...EMPTY, confirm_duplicate: false, lead_id: leadId ?? '' });
    const [sameAddress, setSameAddress] = useState(true);
    const duplicate = (form.errors as Record<string, string>).duplicate;

    useEffect(() => {
        if (!open) return;
        const values = { ...EMPTY, ...initial };
        for (const key of Object.keys(values) as (keyof CustomerFormValues)[]) values[key] = values[key] ?? '';
        form.setData({ ...values, confirm_duplicate: false, lead_id: leadId ?? '' });
        form.clearErrors();
        setSameAddress(!customerId || values.billing_address === values.service_address);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const set = <K extends keyof CustomerFormValues>(key: K) => (e: { target: { value: string } }) => form.setData((d) => ({ ...d, [key]: e.target.value }));
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, billing_address: sameAddress ? d.service_address : d.billing_address, confirm_duplicate: d.confirm_duplicate || !!duplicate }));
        const options = { preserveScroll: true, onSuccess: () => (onSaved ?? (() => onOpenChange(false)))() };
        if (customerId) form.put(`/admin/customers/${customerId}`, options);
        else form.post('/admin/customers', options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
                <DialogHeader><DialogTitle>{customerId ? 'Edit Customer' : 'Register Customer'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    {duplicate && (
                        <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{duplicate}. Check it isn't the same person. Press Save again to continue anyway.</p>
                        </div>
                    )}
                    <Field label="Customer type" required error={form.errors.type}><SelectField value={form.data.type} onChange={(v) => form.setData('type', v)} options={enums.customerType} /></Field>
                    {form.data.type === 'business' ? (
                        <Field label="Organization name" required error={form.errors.organization_name}><Input value={form.data.organization_name} onChange={set('organization_name')} /></Field>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="First name" required error={form.errors.first_name}><Input value={form.data.first_name} onChange={set('first_name')} /></Field>
                            <Field label="Last name" required error={form.errors.last_name}><Input value={form.data.last_name} onChange={set('last_name')} /></Field>
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Mobile number" required error={form.errors.mobile}><Input value={form.data.mobile} onChange={set('mobile')} inputMode="tel" placeholder="09171234567" /></Field>
                        <Field label="Alternate contact" error={form.errors.alternate_contact}><Input value={form.data.alternate_contact} onChange={set('alternate_contact')} inputMode="tel" /></Field>
                    </div>
                    <Field label="Email" error={form.errors.email} hint="Needed for email notifications."><Input type="email" value={form.data.email} onChange={set('email')} /></Field>
                    <Field label="Service address" required error={form.errors.service_address}><Input value={form.data.service_address} onChange={set('service_address')} /></Field>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={sameAddress} onCheckedChange={(v) => setSameAddress(v === true)} />Billing address is the same</label>
                    {!sameAddress && <Field label="Billing address" required error={form.errors.billing_address}><Input value={form.data.billing_address} onChange={set('billing_address')} /></Field>}
                    <Field label="Landmark / installation notes" error={form.errors.landmark}><Input value={form.data.landmark} onChange={set('landmark')} /></Field>
                    <Field label="Account notes" error={form.errors.account_notes}><Textarea rows={3} value={form.data.account_notes} onChange={set('account_notes')} /></Field>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <SubmitButton type="submit" processing={form.processing}>{customerId ? 'Save Changes' : 'Register Customer'}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
