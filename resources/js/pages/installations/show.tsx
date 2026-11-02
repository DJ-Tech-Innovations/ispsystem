import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, BadgeCheck, CalendarClock, Download, History, MapPin, Paperclip, Phone, Upload } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { InstallationForm } from '@/components/app/InstallationForm';
import { LocationCard } from '@/components/app/LocationCard';
import { Card, ConfirmAction, Detail, Field, Page, SelectField, StatusBadge, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCan, useShared } from '@/hooks/use-shared';
import { dateTime, titleCase } from '@/lib/format';
import type { Person } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
const NEXT: Record<string, string[]> = {
    pending: ['scheduled', 'assigned', 'on_hold', 'cancelled'], scheduled: ['assigned', 'rescheduled', 'on_hold', 'cancelled'], assigned: ['in_progress', 'rescheduled', 'on_hold', 'cancelled'],
    in_progress: ['completed', 'rescheduled', 'on_hold', 'cancelled'], rescheduled: ['scheduled', 'assigned', 'on_hold', 'cancelled'], on_hold: ['pending', 'scheduled', 'assigned', 'cancelled'], completed: [], cancelled: [],
};

export default function InstallationShow({ job, technicians }: { job: any; technicians: Person[] }) {
    const can = useCan();
    const { enums } = useShared();
    const [scheduling, setScheduling] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const options = enums.installationStatus.filter((o) => NEXT[job.status].includes(o.value));
    const progress = useForm({ status: options[0]?.value ?? '', remarks: '' });
    const upload = useForm<{ file: File | null }>({ file: null });

    return (
        <Page>
            <Head title={job.reference} />
            <Link href="/admin/installations" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Installations</Link>
            <PageHeader title={job.reference} description={job.customer.name} actions={<>
                <StatusBadge value={job.status} />
                {job.confirmed_at && <StatusBadge value="confirmed" />}
                <Can permission="installations.edit">{!['completed', 'cancelled'].includes(job.status) && <Button variant="outline" className="bg-card" onClick={() => setScheduling(true)}><CalendarClock className="mr-2 h-4 w-4" />Schedule</Button>}</Can>
                <Can permission="installations.confirm">{job.status === 'completed' && !job.confirmed_at && <Button onClick={() => setConfirming(true)}><BadgeCheck className="mr-2 h-4 w-4" />Confirm Completion</Button>}</Can>
            </>} />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card title="Job details" icon={MapPin} tint="violet">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Detail label="Customer">{can('customers.view') ? <Link href={`/admin/customers/${job.customer.id}`} className="text-primary hover:underline">{job.customer.name}</Link> : job.customer.name}</Detail>
                            <Detail label="Mobile"><a href={`tel:${job.customer.mobile}`} className="inline-flex items-center gap-1.5 text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{job.customer.mobile}</a></Detail>
                            <Detail label="Subscription">{can('subscriptions.view') ? <Link href={`/admin/subscriptions/${job.subscription.id}`} className="text-primary hover:underline">{job.subscription.reference}</Link> : job.subscription.reference}</Detail>
                            <Detail label="Plan">{job.subscription.plan?.name}</Detail>
                            <Detail label="Preferred schedule">{dateTime(job.preferred_at)}</Detail>
                            <Detail label="Technician">{job.technician?.name ?? 'Unassigned'}</Detail>
                            <div className="sm:col-span-2"><Detail label="Address">{job.address}</Detail></div>
                            {job.customer.landmark && <div className="sm:col-span-2"><Detail label="Landmark">{job.customer.landmark}</Detail></div>}
                            {job.notes && <div className="sm:col-span-2"><Detail label="Notes"><span className="whitespace-pre-wrap font-normal">{job.notes}</span></Detail></div>}
                            {job.completion_remarks && <div className="sm:col-span-2"><Detail label="Completion remarks"><span className="whitespace-pre-wrap font-normal">{job.completion_remarks}</span></Detail></div>}
                            {job.completed_at && <Detail label="Completed">{dateTime(job.completed_at)}</Detail>}
                            {job.confirmed_at && <Detail label="Confirmed">{dateTime(job.confirmed_at)} · {job.confirmer?.name}</Detail>}
                        </div>
                    </Card>

                    <Can permission="installations.update_progress">
                        {options.length > 0 && (
                            <Card title="Update progress">
                                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); progress.put(`/admin/installations/${job.id}/progress`, { preserveScroll: true, onSuccess: () => progress.reset('remarks') }); }}>
                                    <Field label="New status" error={progress.errors.status}><SelectField value={progress.data.status} onChange={(v) => progress.setData('status', v)} options={options} /></Field>
                                    <Field label={progress.data.status === 'completed' ? 'Completion remarks' : 'Remarks'} required={progress.data.status === 'completed'} error={progress.errors.remarks}><Textarea rows={3} value={progress.data.remarks} onChange={(e) => progress.setData('remarks', e.target.value)} /></Field>
                                    <SubmitButton type="submit" processing={progress.processing}>Save Update</SubmitButton>
                                </form>
                            </Card>
                        )}
                    </Can>
                </div>

                <div className="space-y-6">
                    <LocationCard location={job.customer} updateUrl={`/admin/installations/${job.id}/location`} editable={can('installations.update_progress')} />
                    <Card title="Attachment" subtitle="Photo or signed form" icon={Paperclip} tint="slate">
                        {job.attachment_name && <a href={`/admin/installations/${job.id}/attachment`} className="mb-3 flex items-center gap-2 truncate text-sm font-medium text-primary hover:underline"><Download className="h-4 w-4 shrink-0" />{job.attachment_name}</a>}
                        <Can permission="installations.update_progress">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                                <Upload className="h-4 w-4" />{upload.processing ? 'Uploading...' : 'Upload file'}
                                <input type="file" className="sr-only" accept="image/*,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) { upload.transform(() => ({ file })); upload.post(`/admin/installations/${job.id}/attachment`, { preserveScroll: true, forceFormData: true }); } }} />
                            </label>
                            {upload.errors.file && <p className="mt-1 text-xs text-destructive">{upload.errors.file}</p>}
                        </Can>
                    </Card>
                    <Card title="History" icon={History} tint="slate">
                        <ol className="space-y-4 border-l border-border pl-4">
                            {job.updates.map((u: any) => (
                                <li key={u.id} className="relative">
                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden="true" />
                                    <p className="text-sm font-medium">{u.old_status ? `${titleCase(u.old_status)} → ` : ''}{titleCase(u.new_status)}</p>
                                    {u.remarks && <p className="text-sm text-muted-foreground">{u.remarks}</p>}
                                    <p className="mt-0.5 text-xs text-muted-foreground">{dateTime(u.created_at)}{u.user ? ` · ${u.user.name}` : ''}</p>
                                </li>
                            ))}
                        </ol>
                    </Card>
                </div>
            </div>
            <InstallationForm open={scheduling} onOpenChange={setScheduling} technicians={technicians} job={job} />
            <ConfirmAction open={confirming} onOpenChange={setConfirming} title="Confirm this installation?" description="This allows the subscription to be activated. It does not activate it automatically." url={`/admin/installations/${job.id}/confirm`} confirmLabel="Confirm" />
        </Page>
    );
}
