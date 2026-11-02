import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/AuthLayout';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const form = useForm({ token, email, password: '', password_confirmation: '' });
    const submit = (e: FormEvent) => { e.preventDefault(); form.post('/reset-password'); };

    return (
        <AuthLayout title="Reset password" description="Choose a new password for your account">
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />{form.errors.email && <p className="text-xs text-destructive">{form.errors.email}</p>}</div>
                <div className="space-y-1.5"><Label htmlFor="password">New password</Label><Input id="password" type="password" required autoFocus value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />{form.errors.password && <p className="text-xs text-destructive">{form.errors.password}</p>}</div>
                <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" required value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={form.processing}>{form.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reset password</Button>
            </form>
        </AuthLayout>
    );
}
