import { Head, useForm } from '@inertiajs/react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Can } from '@/components/app/Can';
import { ConfirmAction, EmptyState, Field, Page, Pagination, SelectField, StatusBadge, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/use-shared';
import { date, titleCase, toLocalInput } from '@/lib/format';
import type { Paginated, Person } from '@/types';

interface Announcement { id: string; title: string; body: string; audience: string; is_published: boolean; starts_at: string | null; ends_at: string | null; author: Person | null; created_at: string }
const AUDIENCE = [{ value: 'all', label: 'Website and customers' }, { value: 'website', label: 'Website only' }, { value: 'customers', label: 'Customer portal only' }];

export default function AnnouncementsIndex({ announcements }: { announcements: Paginated<Announcement> }) {
    const can = useCan();
    const blank = { title: '', body: '', audience: 'all', is_published: false, starts_at: '', ends_at: '' };
    const form = useForm(blank);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [deleting, setDeleting] = useState<Announcement | null>(null);
    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(editing ? { title: editing.title, body: editing.body, audience: editing.audience, is_published: editing.is_published, starts_at: toLocalInput(editing.starts_at), ends_at: toLocalInput(editing.ends_at) } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);
    const start = (a: Announcement | null) => { setEditing(a); setOpen(true); };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, starts_at: d.starts_at || null, ends_at: d.ends_at || null }));
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) form.put(`/admin/announcements/${editing.id}`, options); else form.post('/admin/announcements', options);
    };

    return (
        <Page>
            <Head title="Announcements" />
            <PageHeader title="Announcements" description="Notices for your website and customer portal" actions={<Can permission="announcements.manage"><Button onClick={() => start(null)}><Plus className="mr-2 h-4 w-4" />New Announcement</Button></Can>} />
            {announcements.total === 0 ? (
                <EmptyState icon={<Megaphone className="h-6 w-6" />} title="No announcements" description="Let customers know about outages and promotions." action={can('announcements.manage') ? <Button onClick={() => start(null)}>New Announcement</Button> : undefined} />
            ) : (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {announcements.data.map((a) => (
                            <article key={a.id} className="rounded-2xl bg-card p-5 shadow-card">
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="min-w-0 text-base font-semibold">{a.title}</h2>
                                    <StatusBadge value={a.is_published ? 'active' : 'draft'} label={a.is_published ? 'Published' : 'Draft'} />
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">{AUDIENCE.find((x) => x.value === a.audience)?.label ?? titleCase(a.audience)} · {a.starts_at ? `${date(a.starts_at)} – ${date(a.ends_at)}` : date(a.created_at)}</p>
                                    <Can permission="announcements.manage">
                                        <div className="flex shrink-0 gap-1">
                                            <Button variant="ghost" size="sm" aria-label={`Edit ${a.title}`} onClick={() => start(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="sm" aria-label={`Delete ${a.title}`} onClick={() => setDeleting(a)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </Can>
                                </div>
                            </article>
                        ))}
                    </div>
                    <Pagination meta={announcements} label="announcements" />
                </>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-3xl sm:max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Title" required error={form.errors.title}><Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} /></Field>
                        <Field label="Message" required error={form.errors.body}><Textarea rows={4} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} /></Field>
                        <Field label="Audience" required error={form.errors.audience}><SelectField value={form.data.audience} onChange={(v) => form.setData('audience', v)} options={AUDIENCE} /></Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Show from" error={form.errors.starts_at}><Input type="datetime-local" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} /></Field>
                            <Field label="Show until" error={form.errors.ends_at}><Input type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} /></Field>
                        </div>
                        <label className="flex items-center justify-between rounded-xl bg-muted/50 p-4 text-sm">Publish<Switch checked={form.data.is_published} onCheckedChange={(v) => form.setData('is_published', v)} /></label>
                        <DialogFooter><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton type="submit" processing={form.processing}>Save</SubmitButton></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <ConfirmAction open={!!deleting} onOpenChange={() => setDeleting(null)} title="Delete this announcement?" description={deleting?.title ?? ''} url={`/admin/announcements/${deleting?.id}`} method="delete" confirmLabel="Delete" destructive />
        </Page>
    );
}
