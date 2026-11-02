import { Head, useForm } from '@inertiajs/react';
import { KeyRound, User } from 'lucide-react';
import { Card, Field, Page, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Input } from '@/components/ui/input';

export default function Account({ profile }: { profile: { name: string; email: string; phone: string | null } }) {
    const details = useForm({ name: profile.name, email: profile.email, phone: profile.phone ?? '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    return (
        <Page>
            <Head title="My Account" />
            <PageHeader title="My Account" description="Your profile and password" />
            <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
                <Card title="Profile" icon={User}>
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); details.put('/admin/account', { preserveScroll: true }); }}>
                        <Field label="Full name" required error={details.errors.name}><Input value={details.data.name} onChange={(e) => details.setData('name', e.target.value)} /></Field>
                        <Field label="Email" required error={details.errors.email}><Input type="email" value={details.data.email} onChange={(e) => details.setData('email', e.target.value)} /></Field>
                        <Field label="Phone" error={details.errors.phone}><Input value={details.data.phone} onChange={(e) => details.setData('phone', e.target.value)} /></Field>
                        <SubmitButton type="submit" processing={details.processing}>Save Profile</SubmitButton>
                    </form>
                </Card>
                <Card title="Change password" icon={KeyRound} tint="amber">
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); password.put('/admin/account/password', { preserveScroll: true, onSuccess: () => password.reset() }); }}>
                        <Field label="Current password" required error={password.errors.current_password}><Input type="password" autoComplete="current-password" value={password.data.current_password} onChange={(e) => password.setData('current_password', e.target.value)} /></Field>
                        <Field label="New password" required error={password.errors.password} hint="At least 10 characters."><Input type="password" autoComplete="new-password" value={password.data.password} onChange={(e) => password.setData('password', e.target.value)} /></Field>
                        <Field label="Confirm new password" required><Input type="password" autoComplete="new-password" value={password.data.password_confirmation} onChange={(e) => password.setData('password_confirmation', e.target.value)} /></Field>
                        <SubmitButton type="submit" processing={password.processing}>Change Password</SubmitButton>
                    </form>
                </Card>
            </div>
        </Page>
    );
}
