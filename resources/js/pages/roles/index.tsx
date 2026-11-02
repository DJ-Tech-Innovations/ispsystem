import { Head, useForm } from '@inertiajs/react';
import { Lock, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ConfirmAction, Field, Page, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Role { id: number; name: string; label: string; locked: boolean; users_count: number; permissions: string[] }
const BUILT_IN = ['owner', 'administrator', 'billing', 'customer_service', 'technician', 'subscriber'];

export default function RolesIndex({ roles, catalog }: { roles: Role[]; catalog: Record<string, Record<string, string>> }) {
    const visible = roles.filter((r) => r.name !== 'subscriber');
    const [selectedId, setSelectedId] = useState(visible[0]?.id);
    const role = visible.find((r) => r.id === selectedId) ?? visible[0];
    const form = useForm<{ permissions: string[] }>({ permissions: [] });
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const create = useForm({ name: '', permissions: [] as string[] });
    useEffect(() => { form.setData('permissions', role?.permissions ?? []); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [role?.id, role?.permissions.length]);

    const all = useMemo(() => Object.values(catalog).flatMap((g) => Object.keys(g)), [catalog]);
    const granted = new Set(role?.locked ? all : form.data.permissions);
    const readOnly = !!role?.locked;
    const setMany = (names: string[], on: boolean) => { const next = new Set(form.data.permissions); names.forEach((n) => (on ? next.add(n) : next.delete(n))); form.setData('permissions', [...next]); };
    const q = query.trim().toLowerCase();
    const groups = Object.entries(catalog).map(([group, perms]) => [group, Object.entries(perms).filter(([n, d]) => !q || group.toLowerCase().includes(q) || n.includes(q) || d.toLowerCase().includes(q))] as const).filter(([, p]) => p.length);
    const submit = (e: FormEvent) => { e.preventDefault(); form.put(`/admin/roles/${role.id}`, { preserveScroll: true }); };

    return (
        <Page>
            <Head title="Roles" />
            <PageHeader title="Roles & Permissions" description="Decide what each role can see and do" actions={<Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Add Role</Button>} />
            <div className="grid gap-6 lg:grid-cols-4">
                <nav aria-label="Roles" className="self-start rounded-2xl bg-card p-2 shadow-card">
                    {visible.map((r) => (
                        <button key={r.id} type="button" onClick={() => setSelectedId(r.id)} aria-current={r.id === role?.id} className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors', r.id === role?.id ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted')}>
                            <Shield className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{r.label}</span><span className="text-xs text-muted-foreground tabular-nums">{r.users_count}</span>
                        </button>
                    ))}
                </nav>
                {role && (
                    <form onSubmit={submit} className="overflow-hidden rounded-2xl bg-card shadow-card lg:col-span-3">
                        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
                            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search permissions" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search permissions..." className="h-9 pl-9" /></div>
                            <span className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{granted.size}</span> of {all.length} granted</span>
                            {readOnly ? <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-4 w-4" />Always has everything</span> : (
                                <div className="ml-auto flex gap-2">
                                    {!BUILT_IN.includes(role.name) && <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(true)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setMany(all, true)}>Grant all</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => form.setData('permissions', [])}>Clear</Button>
                                    <SubmitButton type="submit" size="sm" processing={form.processing}>Save</SubmitButton>
                                </div>
                            )}
                        </div>
                        <div className="divide-y divide-border">
                            {groups.map(([group, perms]) => {
                                const names = perms.map(([n]) => n);
                                const on = names.filter((n) => granted.has(n)).length;
                                return (
                                    <div key={group} className="px-5 py-4">
                                        <div className="mb-3 flex items-center gap-3">
                                            <Checkbox aria-label={`Toggle all ${group} permissions`} disabled={readOnly} checked={on === names.length ? true : on > 0 ? 'indeterminate' : false} onCheckedChange={() => setMany(names, on !== names.length)} />
                                            <h3 className="text-sm font-semibold">{group}</h3>
                                            <span className={cn('rounded-full px-2 py-0.5 text-xs tabular-nums', on === names.length ? 'bg-emerald-50 text-emerald-700' : on > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>{on}/{names.length}</span>
                                        </div>
                                        <div className="grid gap-2 sm:ml-7 sm:grid-cols-2">
                                            {perms.map(([name, description]) => (
                                                <label key={name} className={cn('flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors', granted.has(name) ? 'border-blue-200 bg-blue-50/60' : 'border-border bg-card', readOnly ? 'cursor-default' : 'cursor-pointer hover:border-blue-300')}>
                                                    <Checkbox checked={granted.has(name)} disabled={readOnly} onCheckedChange={(v) => setMany([name], v === true)} className="mt-0.5" />
                                                    <span className="min-w-0"><span className="block text-sm">{description}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{name}</span></span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </form>
                )}
            </div>
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader><DialogTitle>Add Role</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); create.post('/admin/roles', { preserveScroll: true, onSuccess: () => { setCreating(false); create.reset(); } }); }} className="space-y-4">
                        <Field label="Role name" required error={create.errors.name} hint="You choose its permissions after creating it."><Input autoFocus value={create.data.name} onChange={(e) => create.setData('name', e.target.value)} placeholder="Team Leader" /></Field>
                        <DialogFooter><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><SubmitButton type="submit" processing={create.processing}>Add Role</SubmitButton></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <ConfirmAction open={deleting} onOpenChange={setDeleting} title={`Delete ${role?.label}?`} description="Only roles with no users can be deleted." url={`/admin/roles/${role?.id}`} method="delete" confirmLabel="Delete" destructive />
        </Page>
    );
}
