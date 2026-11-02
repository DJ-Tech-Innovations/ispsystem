import { Link, useForm } from '@inertiajs/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/AuthLayout';

export default function ForgotPassword({ status, portal, email }: { status?: string; portal?: boolean; email?: string }) {
    const form = useForm({ email: email ?? '' });
    const submit = (e: FormEvent) => { e.preventDefault(); form.post('/forgot-password'); };

    return (
        <AuthLayout title={portal ? 'Set your password' : 'Forgot password'} description="We'll email you a secure link" footer={<Link href={portal ? '/portal/login' : '/login'} className="font-medium text-primary hover:underline">Back to sign in</Link>}>
            <form onSubmit={submit} className="space-y-4">
                {status && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{status}</AlertDescription></Alert>}
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required autoFocus value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                    {form.errors.email && <p className="text-xs text-destructive">{form.errors.email}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={form.processing}>{form.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send link</Button>
            </form>
        </AuthLayout>
    );
}
