import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ChevronRight, LifeBuoy, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState, Field, SelectField, SimplePager, StatusBadge, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { date } from '@/lib/format';
import type { Option, Paginated } from '@/types';

interface Ticket { id: string; number: string; subject: string; status: string; created_at: string }
interface Props { tickets: Paginated<Ticket>; subscriptions: { id: string; reference: string; plan: { name: string } | null }[]; categories: Option[] }

export default function PortalTickets({ tickets, subscriptions, categories }: Props) {
    const { url } = usePage();
    const [open, setOpen] = useState(url.includes('new=1'));
    const form = useForm({ category: 'no_internet', subject: '', description: '', subscription_id: subscriptions[0]?.id ?? '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, subscription_id: d.subscription_id || null }));
        form.post('/portal/tickets');
    };
    const report = <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Report a Problem</Button>;

    return (
        <>
            <Head title="Support" />
            <div className="mb-6 flex items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight">Support</h1>{tickets.total > 0 && report}</div>
            {tickets.total === 0 ? <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title="No tickets yet" description="Having a problem? Tell us and we will help." action={report} /> : (
                <>
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
                        {tickets.data.map((t) => (
                            <li key={t.id}><Link href={`/portal/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 sm:px-6">
                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t.subject}</span><span className="block text-xs text-muted-foreground">{t.number} · {date(t.created_at)}</span></span>
                                <StatusBadge value={t.status} /><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link></li>
                        ))}
                    </ul>
                    <SimplePager meta={tickets} />
                </>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
                    <DialogHeader><DialogTitle>Report a Problem</DialogTitle></DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="What's it about?" required error={form.errors.category}><SelectField value={form.data.category} onChange={(v) => form.setData('category', v)} options={categories} /></Field>
                        {subscriptions.length > 1 && <Field label="Which service?" error={form.errors.subscription_id}><SelectField value={form.data.subscription_id} onChange={(v) => form.setData('subscription_id', v)} options={subscriptions.map((s) => ({ value: s.id, label: `${s.plan?.name} (${s.reference})` }))} /></Field>}
                        <Field label="Subject" required error={form.errors.subject}><Input value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} /></Field>
                        <Field label="Tell us what's happening" required error={form.errors.description}><Textarea rows={4} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></Field>
                        <DialogFooter><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton type="submit" processing={form.processing}>Send</SubmitButton></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
