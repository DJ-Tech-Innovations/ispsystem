import { Head, useForm } from '@inertiajs/react';
import { Building2, Mail, Receipt, Ticket, Upload, Users } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { Field, Page, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4 text-sm"><span><span className="block font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span><Switch checked={checked} onCheckedChange={onChange} /></label>
);
const Section = ({ children }: { children: ReactNode }) => <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">{children}</div>;

export default function SettingsIndex({ settings }: { settings: Record<string, any> }) {
    const form = useForm<Record<string, any>>({ ...settings, billing__default_day: settings.billing__default_day ?? '' });
    const logo = useForm<{ logo: File | null }>({ logo: null });
    const errors = form.errors as Record<string, string>;
    const err = (key: string) => errors[key.replace('__', '.')];
    const input = (key: string, label: string, props: Record<string, unknown> = {}) => (
        <Field label={label} error={err(key)} hint={props.hint as string | undefined}><Input value={form.data[key] ?? ''} onChange={(e) => form.setData(key, e.target.value)} {...{ ...props, hint: undefined }} /></Field>
    );
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, billing__default_day: d.billing__default_day || null }));
        form.put('/admin/settings', { preserveScroll: true });
    };
    const fields: string[] = form.data.customers__duplicate_fields ?? [];

    return (
        <Page>
            <Head title="Settings" />
            <PageHeader title="Settings" description="Business details and how the system behaves" />
            <form onSubmit={submit}>
                <Tabs defaultValue="business" className="max-w-4xl">
                    <TabsList className="mb-2 h-auto flex-wrap justify-start bg-card shadow-card">
                        <TabsTrigger value="business"><Building2 className="mr-1.5 h-4 w-4" />Business</TabsTrigger>
                        <TabsTrigger value="billing"><Receipt className="mr-1.5 h-4 w-4" />Billing</TabsTrigger>
                        <TabsTrigger value="tickets"><Ticket className="mr-1.5 h-4 w-4" />Tickets</TabsTrigger>
                        <TabsTrigger value="customers"><Users className="mr-1.5 h-4 w-4" />Customers</TabsTrigger>
                        <TabsTrigger value="notifications"><Mail className="mr-1.5 h-4 w-4" />Notifications</TabsTrigger>
                    </TabsList>
                    <TabsContent value="business">
                        <Section>
                            <Field label="Logo" error={logo.errors.logo} hint="PNG, JPG or WebP, up to 2 MB.">
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary">
                                    <Upload className="h-4 w-4" />{logo.processing ? 'Uploading...' : 'Choose a logo'}
                                    <input type="file" className="sr-only" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { logo.transform(() => ({ logo: file })); logo.post('/admin/settings/logo', { forceFormData: true, preserveScroll: true }); } }} />
                                </label>
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {input('business__name', 'Business name')}
                                {input('business__tagline', 'Tagline')}
                                {input('business__email', 'Support email', { type: 'email' })}
                                {input('business__phone', 'Phone')}
                                {input('business__phone_2', 'Second phone')}
                                {input('business__tin', 'TIN')}
                            </div>
                            {input('business__address', 'Address')}
                        </Section>
                    </TabsContent>
                    <TabsContent value="billing">
                        <Section>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {input('billing__default_day', 'Common billing day', { type: 'number', min: 1, max: 31, hint: 'Blank bills each customer on their start-date anniversary.' })}
                                {input('billing__due_days', 'Days until payment is due', { type: 'number', min: 0 })}
                                {input('billing__tax_rate', 'Tax rate (%)', { inputMode: 'decimal' })}
                                {input('billing__tax_label', 'Tax label')}
                                {input('billing__due_reminder_days', 'Due reminder (days before)', { type: 'number', min: 0 })}
                                {input('billing__overdue_reminder_days', 'Overdue reminder (days after)', { type: 'number', min: 0 })}
                            </div>
                            <Toggle label="Keep billing suspended subscriptions" hint="Off means no invoices during suspension." checked={!!form.data.billing__bill_suspended} onChange={(v) => form.setData('billing__bill_suspended', v)} />
                            <Toggle label="Add installation fee to the first invoice" checked={!!form.data.billing__installation_fee_on_first_invoice} onChange={(v) => form.setData('billing__installation_fee_on_first_invoice', v)} />
                            <Field label="Invoice footer" error={err('billing__invoice_footer')}><Textarea rows={3} value={form.data.billing__invoice_footer ?? ''} onChange={(e) => form.setData('billing__invoice_footer', e.target.value)} placeholder="Payment instructions, bank and e-wallet details..." /></Field>
                        </Section>
                    </TabsContent>
                    <TabsContent value="tickets">
                        <Section>
                            <p className="text-sm font-semibold">Response targets (hours)</p>
                            <div className="grid gap-4 sm:grid-cols-4">
                                {input('tickets__sla_hours_urgent', 'Urgent', { type: 'number', min: 1 })}
                                {input('tickets__sla_hours_high', 'High', { type: 'number', min: 1 })}
                                {input('tickets__sla_hours_normal', 'Normal', { type: 'number', min: 1 })}
                                {input('tickets__sla_hours_low', 'Low', { type: 'number', min: 1 })}
                            </div>
                            <Toggle label="Allow reopening tickets" checked={!!form.data.tickets__allow_reopen} onChange={(v) => form.setData('tickets__allow_reopen', v)} />
                            <div className="grid gap-4 sm:grid-cols-2">
                                {input('tickets__reopen_window_days', 'Reopen window (days)', { type: 'number', min: 0 })}
                                {input('tickets__auto_close_days', 'Close resolved tickets after (days)', { type: 'number', min: 0, hint: '0 turns auto-close off.' })}
                            </div>
                        </Section>
                    </TabsContent>
                    <TabsContent value="customers">
                        <Section>
                            <div><p className="text-sm font-semibold">Duplicate check</p><p className="text-xs text-muted-foreground">Warn when a new customer matches on these fields. Name only narrows a mobile or email match.</p></div>
                            {['mobile', 'email', 'name'].map((f) => (
                                <label key={f} className="flex items-center gap-2 text-sm capitalize"><Checkbox checked={fields.includes(f)} onCheckedChange={(v) => form.setData('customers__duplicate_fields', v ? [...fields, f] : fields.filter((x) => x !== f))} />{f}</label>
                            ))}
                        </Section>
                    </TabsContent>
                    <TabsContent value="notifications">
                        <Section>
                            <Toggle label="Send email notifications" checked={!!form.data.notifications__email_enabled} onChange={(v) => form.setData('notifications__email_enabled', v)} />
                            <Toggle label="Send SMS notifications" hint="Needs an SMS provider. Leave off until one is connected." checked={!!form.data.notifications__sms_enabled} onChange={(v) => form.setData('notifications__sms_enabled', v)} />
                        </Section>
                    </TabsContent>
                </Tabs>
                <SubmitButton type="submit" className="mt-4" processing={form.processing}>Save Settings</SubmitButton>
            </form>
        </Page>
    );
}
