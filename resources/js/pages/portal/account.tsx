import { Head, router, useForm } from '@inertiajs/react';
import { Bell, KeyRound, UserRound } from 'lucide-react';
import { Card, Detail, Field, SubmitButton } from '@/components/app/kit';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface Props {
    profile: { name: string; reference: string; email: string | null; mobile: string; alternate_contact: string | null; billing_address: string; service_address: string; landmark: string | null };
    preferences: { email_enabled: boolean; sms_enabled: boolean };
}

export default function PortalAccount({ profile, preferences }: Props) {
    const contact = useForm({ mobile: profile.mobile, alternate_contact: profile.alternate_contact ?? '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const setPref = (key: string, value: boolean) => router.put('/portal/account/preferences', { ...preferences, [key]: value }, { preserveScroll: true });

    return (
        <>
            <Head title="Account" />
            <h1 className="mb-6 text-2xl font-bold tracking-tight">My account</h1>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Profile" subtitle="Contact us to change these details" icon={UserRound}>
                    <div className="space-y-4">
                        <Detail label="Name">{profile.name}</Detail>
                        <Detail label="Account number">{profile.reference}</Detail>
                        <Detail label="Email">{profile.email}</Detail>
                        <Detail label="Service address">{profile.service_address}</Detail>
                        <Detail label="Billing address">{profile.billing_address}</Detail>
                    </div>
                </Card>
                <div className="space-y-6">
                    <Card title="Phone numbers">
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); contact.put('/portal/account', { preserveScroll: true }); }}>
                            <Field label="Mobile number" required error={contact.errors.mobile}><Input inputMode="tel" value={contact.data.mobile} onChange={(e) => contact.setData('mobile', e.target.value)} /></Field>
                            <Field label="Alternate contact" error={contact.errors.alternate_contact}><Input inputMode="tel" value={contact.data.alternate_contact} onChange={(e) => contact.setData('alternate_contact', e.target.value)} /></Field>
                            <SubmitButton type="submit" processing={contact.processing}>Save</SubmitButton>
                        </form>
                    </Card>
                    <Card title="Notifications" subtitle="Service-related messages we send you" icon={Bell} tint="slate">
                        <label className="flex items-center justify-between py-1 text-sm">Email<Switch checked={preferences.email_enabled} onCheckedChange={(v) => setPref('email_enabled', v)} /></label>
                        <label className="flex items-center justify-between py-1 text-sm">SMS<Switch checked={preferences.sms_enabled} onCheckedChange={(v) => setPref('sms_enabled', v)} /></label>
                    </Card>
                    <Card title="Change password" icon={KeyRound} tint="amber">
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); password.put('/portal/account/password', { preserveScroll: true, onSuccess: () => password.reset() }); }}>
                            <Field label="Current password" required error={password.errors.current_password}><Input type="password" autoComplete="current-password" value={password.data.current_password} onChange={(e) => password.setData('current_password', e.target.value)} /></Field>
                            <Field label="New password" required error={password.errors.password} hint="At least 10 characters."><Input type="password" autoComplete="new-password" value={password.data.password} onChange={(e) => password.setData('password', e.target.value)} /></Field>
                            <Field label="Confirm new password" required><Input type="password" autoComplete="new-password" value={password.data.password_confirmation} onChange={(e) => password.setData('password_confirmation', e.target.value)} /></Field>
                            <SubmitButton type="submit" processing={password.processing}>Change Password</SubmitButton>
                        </form>
                    </Card>
                </div>
            </div>
        </>
    );
}
