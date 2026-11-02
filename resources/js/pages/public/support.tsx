import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2, MessageCircle, Phone, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { PageHero, Section } from '@/components/app/site';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ContactDetails } from '@/layouts/PublicLayout';
import type { Option } from '@/types';

export default function Support({ categories, ticketNumber, contact }: { categories: Option[]; ticketNumber: string | null; contact: ContactDetails }) {
    const form = useForm({ reference: '', mobile: '', category: 'no_internet', description: '', website: '' });
    const submit = (e: FormEvent) => { e.preventDefault(); form.post('/support', { preserveScroll: true, onSuccess: () => form.reset() }); };
    const ways = [
        { icon: UserRound, title: 'Customer portal', body: 'Follow tickets and reply online.', href: '/portal/login', label: 'Sign in' },
        contact.messenger && { icon: MessageCircle, title: 'Messenger', body: 'Report it in a chat.', href: contact.messenger, label: 'Open Messenger' },
        contact.phone && { icon: Phone, title: 'Call us', body: contact.hours || 'Talk to our local team.', href: `tel:${contact.phone}`, label: contact.phone },
        contact.phone2 && { icon: Phone, title: 'Or call', body: 'Our second line.', href: `tel:${contact.phone2}`, label: contact.phone2 },
    ].filter(Boolean) as { icon: typeof Phone; title: string; body: string; href: string; label: string }[];

    return (
        <>
            <Head title="Support" />
            <PageHero title="How can we help?" subtitle="Report a problem and our team will take it from there." />
            <Section className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
                <ul className="space-y-4">
                    {ways.map((w) => (
                        <li key={w.title} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600"><w.icon className="h-5 w-5" /></span>
                            <span className="min-w-0"><span className="block font-semibold">{w.title}</span><span className="block text-sm text-muted-foreground">{w.body}</span>{w.href.startsWith('/') ? <Link href={w.href} className="text-sm font-medium text-primary hover:underline">{w.label}</Link> : <a href={w.href} className="text-sm font-medium text-primary hover:underline">{w.label}</a>}</span>
                        </li>
                    ))}
                </ul>
                {ticketNumber ? (
                    <div role="status" className="self-start rounded-2xl bg-card p-8 text-center shadow-card">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                        <h2 className="mt-3 text-lg font-semibold">We got your report</h2>
                        {ticketNumber !== 'received' && <p className="mt-1 text-sm text-muted-foreground">Your ticket number is <strong className="text-foreground">{ticketNumber}</strong>.</p>}
                        <p className="mt-1 text-sm text-muted-foreground">Our team will update you by email and in your customer portal.</p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="relative space-y-4 rounded-2xl bg-card p-6 shadow-card">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Account number" required error={form.errors.reference} hint="On your invoice, like CUS-000123."><Input value={form.data.reference} onChange={(e) => form.setData('reference', e.target.value)} /></Field>
                            <Field label="Mobile number on your account" required error={form.errors.mobile}><Input inputMode="tel" autoComplete="tel" value={form.data.mobile} onChange={(e) => form.setData('mobile', e.target.value)} /></Field>
                        </div>
                        <Field label="What's the problem?" required error={form.errors.category}><SelectField value={form.data.category} onChange={(v) => form.setData('category', v)} options={categories} /></Field>
                        <Field label="Tell us what's happening" required error={form.errors.description}><Textarea rows={4} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></Field>
                        <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} /></label></div>
                        <SubmitButton type="submit" className="h-11 w-full bg-ember-500 font-semibold text-royal-950 hover:bg-ember-400" processing={form.processing}>Send Report</SubmitButton>
                        <p className="text-center text-xs text-muted-foreground">Not a customer yet? <Link href="/contact" className="font-medium text-primary hover:underline">Send an inquiry</Link></p>
                    </form>
                )}
            </Section>
        </>
    );
}
