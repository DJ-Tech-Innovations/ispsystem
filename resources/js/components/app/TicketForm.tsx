import { useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import { CustomerPicker, type PickedCustomer } from '@/components/app/CustomerPicker';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCan, useShared } from '@/hooks/use-shared';
import type { Person } from '@/types';

interface TicketValues { id: string; subscription_id: string | null; category: string; subject: string; description: string; priority: string }

export function TicketForm({ open, onOpenChange, staff, customer, subscriptions = [], ticket }: { open: boolean; onOpenChange: (o: boolean) => void; staff: Person[]; customer?: { id: string; name: string; reference: string } | null; subscriptions?: { id: string; reference: string }[]; ticket?: TicketValues }) {
    const { enums } = useShared();
    const can = useCan();
    const blank = { customer_id: customer?.id ?? '', subscription_id: '', category: 'no_internet', subject: '', description: '', priority: 'normal', assigned_to: '' };
    const form = useForm(blank);
    const [picked, setPicked] = useState<PickedCustomer | null>(null);
    useEffect(() => {
        if (!open) return;
        form.clearErrors(); setPicked(null);
        form.setData(ticket ? { ...blank, subscription_id: ticket.subscription_id ?? '', category: ticket.category, subject: ticket.subject, description: ticket.description, priority: ticket.priority } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const subs = picked?.subscriptions ?? subscriptions;
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, subscription_id: d.subscription_id || null, assigned_to: d.assigned_to || null }));
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };
        if (ticket) form.put(`/admin/tickets/${ticket.id}`, options); else form.post('/admin/tickets', options);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-xl">
                <DialogHeader><DialogTitle>{ticket ? 'Edit Ticket' : 'New Ticket'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    {!ticket && (
                        <Field label="Customer" required error={form.errors.customer_id}>
                            {customer ? <Input value={`${customer.name} (${customer.reference})`} disabled /> : <CustomerPicker value={picked} onChange={(c) => { setPicked(c); form.setData((d) => ({ ...d, customer_id: c.id, subscription_id: c.subscriptions[0]?.id ?? '' })); }} />}
                        </Field>
                    )}
                    {subs.length > 0 && <Field label="Related subscription"><SelectField value={form.data.subscription_id} none="None" onChange={(v) => form.setData('subscription_id', v)} options={subs.map((s) => ({ value: s.id, label: s.reference }))} /></Field>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Category" required error={form.errors.category}><SelectField value={form.data.category} onChange={(v) => form.setData('category', v)} options={enums.ticketCategory} /></Field>
                        <Field label="Priority" required error={form.errors.priority}><SelectField value={form.data.priority} onChange={(v) => form.setData('priority', v)} options={enums.ticketPriority} /></Field>
                    </div>
                    <Field label="Subject" required error={form.errors.subject}><Input value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} /></Field>
                    <Field label="Description" required error={form.errors.description}><Textarea rows={4} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></Field>
                    {!ticket && can('tickets.assign') && <Field label="Assign to"><SelectField value={form.data.assigned_to} none="Unassigned" onChange={(v) => form.setData('assigned_to', v)} options={staff.map((s) => ({ value: s.id, label: s.name }))} /></Field>}
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <SubmitButton type="submit" processing={form.processing}>{ticket ? 'Save Changes' : 'Create Ticket'}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
