import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, UserCheck, UserX } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Can } from '@/components/app/Can';
import { Field, Filters, FilterSelect, Page, Pagination, SearchInput, SelectField, StatusBadge, SubmitButton, Table, Td, Tr, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useShared } from '@/hooks/use-shared';
import { dateTime, initials } from '@/lib/format';
import type { Option, Paginated } from '@/types';

interface User { id: string; name: string; email: string; phone: string | null; is_active: boolean; last_login_at: string | null; role: string | null }

export default function UsersIndex({ users, filters, roles }: { users: Paginated<User>; filters: Record<string, string>; roles: Option[] }) {
    const { auth } = useShared();
    const apply = useFilters(filters);
    const blank = { name: '', email: '', phone: '', role: '', password: '' };
    const form = useForm(blank);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const staffRoles = roles.filter((r) => r.value !== 'subscriber');
    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(editing ? { name: editing.name, email: editing.email, phone: editing.phone ?? '', role: editing.role ?? '', password: '' } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);
    const start = (u: User | null) => { setEditing(u); setOpen(true); };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) form.put(`/admin/users/${editing.id}`, options); else form.post('/admin/users', options);
    };

    return (
        <Page>
            <Head title="Users" />
            <PageHeader title="Users" description="Staff accounts and their roles" actions={<Can permission="users.manage"><Button onClick={() => start(null)}><Plus className="mr-2 h-4 w-4" />Add User</Button></Can>} />
            <Filters>
                <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search name or email..." />
                <FilterSelect value={filters.role} onChange={(role) => apply({ role })} options={staffRoles} all="All roles" />
            </Filters>
            <Table headers={['User', 'Role', 'Phone', 'Last Sign-in', 'Status', ['Actions', 'right']]} empty={users.data.length === 0}>
                {users.data.map((u) => (
                    <Tr key={u.id}>
                        <Td>
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{initials(u.name)}</span>
                                <div><p className="whitespace-nowrap font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                            </div>
                        </Td>
                        <Td muted><span className="whitespace-nowrap">{roles.find((r) => r.value === u.role)?.label ?? '—'}</span></Td>
                        <Td muted>{u.phone ?? '—'}</Td>
                        <Td muted><span className="whitespace-nowrap">{dateTime(u.last_login_at)}</span></Td>
                        <Td><StatusBadge value={u.is_active ? 'active' : 'closed'} label={u.is_active ? 'Active' : 'Inactive'} /></Td>
                        <Td right>
                            <Can permission="users.manage">
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="sm" aria-label={`Edit ${u.name}`} onClick={() => start(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    {u.id !== auth?.user.id && <Button variant="ghost" size="sm" aria-label={`${u.is_active ? 'Deactivate' : 'Activate'} ${u.name}`} onClick={() => router.put(`/admin/users/${u.id}/toggle`, {}, { preserveScroll: true })}>{u.is_active ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-emerald-600" />}</Button>}
                                </div>
                            </Can>
                        </Td>
                    </Tr>
                ))}
            </Table>
            <Pagination meta={users} label="users" />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-3xl sm:max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Full name" required error={form.errors.name}><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Email" required error={form.errors.email}><Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} /></Field>
                            <Field label="Phone" error={form.errors.phone}><Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} /></Field>
                        </div>
                        <Field label="Role" required error={form.errors.role}><SelectField value={form.data.role} onChange={(v) => form.setData('role', v)} options={staffRoles} placeholder="Choose a role" /></Field>
                        <Field label={editing ? 'New password' : 'Password'} required={!editing} error={form.errors.password} hint={editing ? 'Leave blank to keep the current password.' : 'At least 10 characters.'}><Input type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} /></Field>
                        <DialogFooter><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton type="submit" processing={form.processing}>{editing ? 'Save Changes' : 'Add User'}</SubmitButton></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
