import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useShared } from '@/hooks/use-shared';
import { money, toLocalInput } from '@/lib/format';

export function PaymentDialog({ open, onOpenChange, invoice }: { open: boolean; onOpenChange: (o: boolean) => void; invoice: { id: string; number: string; balance: string } }) {
    const { enums } = useShared();
    const form = useForm<{ invoice_id: string; paid_at: string; amount: string; method: string; external_reference: string; notes: string; proof: File | null }>({ invoice_id: invoice.id, paid_at: '', amount: '', method: 'cash', external_reference: '', notes: '', proof: null });
    useEffect(() => {
        if (open) { form.clearErrors(); form.setData({ invoice_id: invoice.id, paid_at: toLocalInput(new Date().toISOString()), amount: invoice.balance, method: 'cash', external_reference: '', notes: '', proof: null }); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const submit = (e: FormEvent) => { e.preventDefault(); form.post('/admin/payments', { preserveScroll: true, forceFormData: true, onSuccess: () => onOpenChange(false) }); };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-3xl sm:max-w-lg">
                <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Invoice {invoice.number} · Balance {money(invoice.balance)}</p>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Amount" required error={form.errors.amount}><Input inputMode="decimal" value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} /></Field>
                        <Field label="Date and time" required error={form.errors.paid_at}><Input type="datetime-local" value={form.data.paid_at} onChange={(e) => form.setData('paid_at', e.target.value)} /></Field>
                        <Field label="Method" required error={form.errors.method}><SelectField value={form.data.method} onChange={(v) => form.setData('method', v)} options={enums.paymentMethod} /></Field>
                        <Field label="Reference / receipt no." error={form.errors.external_reference}><Input value={form.data.external_reference} onChange={(e) => form.setData('external_reference', e.target.value)} /></Field>
                    </div>
                    <Field label="Proof of payment" error={form.errors.proof} hint="Image or PDF, up to 5 MB."><Input type="file" accept="image/*,.pdf" onChange={(e) => form.setData('proof', e.target.files?.[0] ?? null)} /></Field>
                    <Field label="Notes" error={form.errors.notes}><Textarea rows={2} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></Field>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <SubmitButton type="submit" processing={form.processing}>Record Payment</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
