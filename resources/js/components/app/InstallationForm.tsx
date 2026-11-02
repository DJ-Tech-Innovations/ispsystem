import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toLocalInput } from '@/lib/format';
import type { Option, Person } from '@/types';

interface Job { id: string; address: string; preferred_at: string | null; technician_id: string | null; notes: string | null }

export function InstallationForm({ open, onOpenChange, technicians, job, subscriptionId, address, subscriptions }: { open: boolean; onOpenChange: (o: boolean) => void; technicians: Person[]; job?: Job; subscriptionId?: string; address?: string; subscriptions?: (Option & { address: string })[] }) {
    const blank = { subscription_id: subscriptionId ?? '', address: address ?? '', preferred_at: '', technician_id: '', notes: '' };
    const form = useForm(blank);
    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(job ? { ...blank, address: job.address, preferred_at: toLocalInput(job.preferred_at), technician_id: job.technician_id ?? '', notes: job.notes ?? '' } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, preferred_at: d.preferred_at || null, technician_id: d.technician_id || null }));
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };
        if (job) form.put(`/admin/installations/${job.id}`, options); else form.post('/admin/installations', options);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-3xl sm:max-w-lg">
                <DialogHeader><DialogTitle>{job ? 'Schedule Job' : 'New Installation Job'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    {subscriptions && (
                        <Field label="Subscription" required error={form.errors.subscription_id}>
                            <SelectField value={form.data.subscription_id} onChange={(v) => form.setData((d) => ({ ...d, subscription_id: v, address: subscriptions.find((s) => s.value === v)?.address ?? d.address }))} placeholder="Choose a subscription" options={subscriptions} />
                        </Field>
                    )}
                    <Field label="Installation address" required={!!job} error={form.errors.address}><Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Preferred schedule" error={form.errors.preferred_at}><Input type="datetime-local" value={form.data.preferred_at} onChange={(e) => form.setData('preferred_at', e.target.value)} /></Field>
                        <Field label="Technician" error={form.errors.technician_id}><SelectField value={form.data.technician_id} none="Unassigned" onChange={(v) => form.setData('technician_id', v)} options={technicians.map((t) => ({ value: t.id, label: t.name }))} /></Field>
                    </div>
                    <Field label="Notes" error={form.errors.notes}><Textarea rows={3} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></Field>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <SubmitButton type="submit" processing={form.processing}>{job ? 'Save' : 'Create Job'}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
