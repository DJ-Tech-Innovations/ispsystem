import { Link, useForm } from '@inertiajs/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useShared } from '@/hooks/use-shared';
import AuthLayout from '@/layouts/AuthLayout';

export default function Login() {
    const { business } = useShared();
    const form = useForm({ email: '', password: '', remember: false });
    const submit = (e: FormEvent) => { e.preventDefault(); form.post('/login', { onFinish: () => form.reset('password') }); };
    const error = form.errors.email || form.errors.password;

    return (
        <AuthLayout title="Staff sign in" description={`Sign in to the ${business.name} admin`} footer={<>Customer? <Link href="/portal/login" className="font-medium text-primary hover:underline">Go to Customer Login</Link></>}>
            <form onSubmit={submit} className="space-y-4">
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" required autoFocus value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                    </div>
                    <Input id="password" type="password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={form.processing}>
                    {form.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in
                </Button>
            </form>
        </AuthLayout>
    );
}
