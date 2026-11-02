import { Head, useForm } from '@inertiajs/react';
import { Check, Eye, EyeOff, Pencil, Plus, Router, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Can } from '@/components/app/Can';
import { ConfirmAction, EmptyState, Field, Page, StatusBadge, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/use-shared';
import { money } from '@/lib/format';

interface Plan { id: string; name: string; code: string; description: string | null; speed_description: string; monthly_price: string; installation_fee: string; installation_fee_recurring: boolean; is_active: boolean; is_public: boolean; sort_order: number; active_subscriptions_count: number }

export default function PlansIndex({ plans }: { plans: Plan[] }) {
    const can = useCan();
    const blank = { name: '', code: '', description: '', speed_description: '', monthly_price: '', installation_fee: '0', installation_fee_recurring: false, is_active: true, is_public: true, sort_order: 0 };
    const form = useForm(blank);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Plan | null>(null);
    const [archiving, setArchiving] = useState<Plan | null>(null);

    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(editing ? { name: editing.name, code: editing.code, description: editing.description ?? '', speed_description: editing.speed_description, monthly_price: editing.monthly_price, installation_fee: editing.installation_fee, installation_fee_recurring: editing.installation_fee_recurring, is_active: editing.is_active, is_public: editing.is_public, sort_order: editing.sort_order } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) form.put(`/admin/plans/${editing.id}`, options); else form.post('/admin/plans', options);
    };
    const start = (plan: Plan | null) => { setEditing(plan); setOpen(true); };

    return (
        <Page>
            <Head title="Service Plans" />
            <PageHeader title="Service Plans" description="Packages and pricing. Changing a price never affects existing subscribers." actions={<Can permission="plans.manage"><Button onClick={() => start(null)}><Plus className="mr-2 h-4 w-4" />Add Plan</Button></Can>} />
            {plans.length === 0 ? (
                <EmptyState icon={<Router className="h-6 w-6" />} title="No plans yet" description="Create your first service plan to start signing up subscribers." action={can('plans.manage') ? <Button onClick={() => start(null)}>Add Plan</Button> : undefined} />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {plans.map((p) => (
                        <article key={p.id} className={`flex flex-col rounded-2xl bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover ${p.is_active ? '' : 'opacity-70'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{p.name}</h2><p className="font-mono text-xs text-muted-foreground">{p.code}</p></div>
                                <StatusBadge value={p.is_active ? 'active' : 'closed'} label={p.is_active ? 'Active' : 'Inactive'} />
                            </div>
                            <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">{money(p.monthly_price)}<span className="text-sm font-normal text-muted-foreground"> /mo</span></p>
                            <p className="mt-1 text-sm font-medium text-primary">{p.speed_description}</p>
                            <p className="mt-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
                            <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{money(p.installation_fee)} installation</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{p.active_subscriptions_count} active subscriber{p.active_subscriptions_count === 1 ? '' : 's'}</li>
                                <li className="flex items-center gap-2">{p.is_public ? <><Eye className="h-4 w-4 text-emerald-600" />Shown on website</> : <><EyeOff className="h-4 w-4" />Hidden from website</>}</li>
                            </ul>
                            <Can permission="plans.manage">
                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => start(p)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                                    <Button variant="ghost" size="sm" aria-label={`Archive ${p.name}`} onClick={() => setArchiving(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                </div>
                            </Can>
                        </article>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-xl">
                    <DialogHeader><DialogTitle>{editing ? 'Edit Plan' : 'Add Plan'}</DialogTitle></DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Plan name" required error={form.errors.name}><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></Field>
                            <Field label="Code" required error={form.errors.code}><Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} placeholder="HOME-50" /></Field>
                        </div>
                        <Field label="Speed" required error={form.errors.speed_description}><Input value={form.data.speed_description} onChange={(e) => form.setData('speed_description', e.target.value)} placeholder="Up to 50 Mbps" /></Field>
                        <Field label="Description" error={form.errors.description}><Textarea rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></Field>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Monthly price" required error={form.errors.monthly_price}><Input inputMode="decimal" value={form.data.monthly_price} onChange={(e) => form.setData('monthly_price', e.target.value)} /></Field>
                            <Field label="Installation fee" required error={form.errors.installation_fee}><Input inputMode="decimal" value={form.data.installation_fee} onChange={(e) => form.setData('installation_fee', e.target.value)} /></Field>
                            <Field label="Sort order" error={form.errors.sort_order}><Input type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} /></Field>
                        </div>
                        <div className="space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
                            <label className="flex items-center justify-between">Plan is active<Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} /></label>
                            <label className="flex items-center justify-between">Show on public website<Switch checked={form.data.is_public} onCheckedChange={(v) => form.setData('is_public', v)} /></label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                            <SubmitButton type="submit" processing={form.processing}>{editing ? 'Save Changes' : 'Add Plan'}</SubmitButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <ConfirmAction open={!!archiving} onOpenChange={() => setArchiving(null)} title={`Archive ${archiving?.name}?`} description="It disappears from new sign-ups. Existing subscribers keep their service and price." url={`/admin/plans/${archiving?.id}`} method="delete" confirmLabel="Archive" destructive />
        </Page>
    );
}
