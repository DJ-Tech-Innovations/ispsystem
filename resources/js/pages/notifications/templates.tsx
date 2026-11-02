import { Head, useForm } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Card, Field, Page, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Template { id: string; event: string; channel: string; subject: string | null; body: string; is_enabled: boolean }

export default function NotificationTemplates({ templates, placeholders }: { templates: Template[]; placeholders: Record<string, string[]> }) {
    const [selected, setSelected] = useState(templates[0]?.id);
    const template = templates.find((t) => t.id === selected) ?? templates[0];
    const form = useForm({ subject: '', body: '', is_enabled: true });
    useEffect(() => {
        if (template) form.setData({ subject: template.subject ?? '', body: template.body, is_enabled: template.is_enabled });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template?.id]);
    const submit = (e: FormEvent) => { e.preventDefault(); form.put(`/admin/notification-templates/${template.id}`, { preserveScroll: true }); };

    return (
        <Page>
            <Head title="Email Templates" />
            <PageHeader title="Email Templates" description="The wording of every automatic email" />
            <div className="grid gap-6 lg:grid-cols-3">
                <nav aria-label="Templates" className="self-start rounded-2xl bg-card p-2 shadow-card">
                    {templates.map((t) => (
                        <button key={t.id} type="button" onClick={() => setSelected(t.id)} aria-current={t.id === template?.id} className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors', t.id === template?.id ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted')}>
                            {titleCase(t.event)}{!t.is_enabled && <span className="text-xs text-muted-foreground">Off</span>}
                        </button>
                    ))}
                </nav>
                {template && (
                    <Card title={titleCase(template.event)} icon={Mail} className="lg:col-span-2" actions={<label className="flex items-center gap-2 text-sm">Enabled<Switch checked={form.data.is_enabled} onCheckedChange={(v) => form.setData('is_enabled', v)} /></label>}>
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Subject" required error={form.errors.subject}><Input value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} /></Field>
                            <Field label="Message" required error={form.errors.body}><Textarea rows={10} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} /></Field>
                            <div>
                                <p className="label-caps mb-2">Placeholders</p>
                                <div className="flex flex-wrap gap-1.5">{placeholders[template.event]?.map((p) => <button key={p} type="button" title="Add to message" onClick={() => form.setData('body', `${form.data.body}{{${p}}}`)} className="rounded-md bg-muted px-2 py-1 font-mono text-xs hover:bg-accent">{`{{${p}}}`}</button>)}</div>
                            </div>
                            <SubmitButton type="submit" processing={form.processing}>Save Template</SubmitButton>
                        </form>
                    </Card>
                )}
            </div>
        </Page>
    );
}
