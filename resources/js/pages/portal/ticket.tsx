import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Paperclip, RotateCcw, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ConfirmAction, StatusBadge, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Message { id: string; body: string; created_at: string; mine: boolean; author: string; attachments: { id: string; original_name: string }[] }
interface Props { ticket: { id: string; number: string; subject: string; description: string; status: string; created_at: string }; category: string; messages: Message[]; canReopen: boolean }

export default function PortalTicket({ ticket: t, category, messages, canReopen }: Props) {
    const [dialog, setDialog] = useState<'reopen' | 'close' | null>(null);
    const reply = useForm<{ body: string; files: File[] }>({ body: '', files: [] });
    const finished = ['resolved', 'closed'].includes(t.status);
    const send = (e: FormEvent) => { e.preventDefault(); reply.post(`/portal/tickets/${t.id}/messages`, { preserveScroll: true, forceFormData: true, onSuccess: () => reply.reset() }); };

    return (
        <>
            <Head title={t.number} />
            <Link href="/portal/tickets" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to support</Link>
            <h1 className="text-2xl font-bold tracking-tight">{t.subject}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><StatusBadge value={t.status} />{t.number} · {category}</div>

            {t.status === 'resolved' && (
                <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-medium">We marked this as resolved. Is everything working?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setDialog('close')}><CheckCircle2 className="mr-1.5 h-4 w-4" />Yes, it's fixed</Button>
                        {canReopen && <Button size="sm" variant="outline" className="bg-card" onClick={() => setDialog('reopen')}><RotateCcw className="mr-1.5 h-4 w-4" />No, reopen it</Button>}
                    </div>
                </div>
            )}
            {t.status === 'closed' && canReopen && <Button variant="outline" className="mt-5 bg-card" onClick={() => setDialog('reopen')}><RotateCcw className="mr-2 h-4 w-4" />Reopen Ticket</Button>}

            <ul className="mt-6 space-y-3">
                <li className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary p-4 text-primary-foreground"><p className="whitespace-pre-wrap text-sm">{t.description}</p><p className="mt-1 text-xs opacity-75">You · {dateTime(t.created_at)}</p></li>
                {messages.map((m) => (
                    <li key={m.id} className={cn('max-w-[85%] rounded-2xl p-4', m.mine ? 'ml-auto rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card shadow-card')}>
                        <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                        {m.attachments.map((a) => <a key={a.id} href={`/portal/attachments/${a.id}`} className="mt-2 flex items-center gap-1.5 text-xs font-medium underline"><Paperclip className="h-3 w-3" />{a.original_name}</a>)}
                        <p className="mt-1 text-xs opacity-75">{m.author} · {dateTime(m.created_at)}</p>
                    </li>
                ))}
            </ul>

            {!finished && (
                <form onSubmit={send} className="mt-6 space-y-3 rounded-2xl bg-card p-4 shadow-card">
                    <Textarea aria-label="Your reply" rows={3} placeholder="Write a reply..." value={reply.data.body} onChange={(e) => reply.setData('body', e.target.value)} />
                    {(reply.errors.body || (reply.errors as Record<string, string>)['files.0']) && <p className="text-xs text-destructive">{reply.errors.body || (reply.errors as Record<string, string>)['files.0']}</p>}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Input aria-label="Attach files" type="file" multiple accept="image/*,.pdf,.txt" className="sm:max-w-xs" onChange={(e) => reply.setData('files', Array.from(e.target.files ?? []))} />
                        <SubmitButton type="submit" processing={reply.processing} disabled={reply.processing || !reply.data.body.trim()}><Send className="mr-2 h-4 w-4" />Send Reply</SubmitButton>
                    </div>
                </form>
            )}
            <ConfirmAction open={dialog === 'close'} onOpenChange={() => setDialog(null)} title="Close this ticket?" description="Thanks for confirming it's fixed." url={`/portal/tickets/${t.id}/close`} confirmLabel="Close Ticket" />
            <ConfirmAction open={dialog === 'reopen'} onOpenChange={() => setDialog(null)} title="Reopen this ticket?" description="Our team will take another look." url={`/portal/tickets/${t.id}/reopen`} confirmLabel="Reopen" />
        </>
    );
}
