import { Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Download, Loader2, Package, Search, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Option, Paginated } from '@/types';

/** The page wrapper every screen shares. */
export const Page = ({ children }: { children: ReactNode }) => <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>;

/** Status colours in one place, so a status always looks the same everywhere. */
const TONES: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700', paid: 'bg-emerald-50 text-emerald-700', completed: 'bg-emerald-50 text-emerald-700', confirmed: 'bg-emerald-50 text-emerald-700', resolved: 'bg-emerald-50 text-emerald-700', sent: 'bg-emerald-50 text-emerald-700', converted: 'bg-emerald-50 text-emerald-700', completed_with_errors: 'bg-amber-50 text-amber-700',
    new: 'bg-blue-50 text-blue-700', open: 'bg-blue-50 text-blue-700', registered: 'bg-blue-50 text-blue-700', scheduled: 'bg-blue-50 text-blue-700', assigned: 'bg-blue-50 text-blue-700', in_progress: 'bg-indigo-50 text-indigo-700', contacted: 'bg-indigo-50 text-indigo-700', qualified: 'bg-violet-50 text-violet-700', for_installation: 'bg-violet-50 text-violet-700', normal: 'bg-blue-50 text-blue-700', running: 'bg-blue-50 text-blue-700', queued: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700', unpaid: 'bg-amber-50 text-amber-700', partially_paid: 'bg-amber-50 text-amber-700', on_hold: 'bg-amber-50 text-amber-700', rescheduled: 'bg-amber-50 text-amber-700', waiting_for_customer: 'bg-amber-50 text-amber-700', inquiry: 'bg-amber-50 text-amber-700', high: 'bg-orange-50 text-orange-700',
    overdue: 'bg-red-50 text-red-700', suspended: 'bg-red-50 text-red-700', urgent: 'bg-red-50 text-red-700', failed: 'bg-red-50 text-red-700', reversed: 'bg-red-50 text-red-700', terminated: 'bg-red-50 text-red-700', lost: 'bg-red-50 text-red-700',
    draft: 'bg-slate-100 text-slate-600', void: 'bg-slate-100 text-slate-600', cancelled: 'bg-slate-100 text-slate-600', closed: 'bg-slate-100 text-slate-600', low: 'bg-slate-100 text-slate-600',
};

export const StatusBadge = ({ value, label }: { value: string; label?: string }) => (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', TONES[value] ?? 'bg-slate-100 text-slate-600')}>{label ?? titleCase(value)}</span>
);

type Tint = 'blue' | 'indigo' | 'teal' | 'amber' | 'violet' | 'emerald' | 'red' | 'slate';
const TINT: Record<Tint, string> = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100', indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100', teal: 'bg-teal-50 text-teal-600 ring-teal-100', amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100', emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100', red: 'bg-red-50 text-red-600 ring-red-100', slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function IconChip({ icon: Icon, tint, size = 'md' }: { icon: LucideIcon; tint: Tint; size?: 'sm' | 'md' }) {
    return (
        <span className={cn('flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', TINT[tint], size === 'md' ? 'h-10 w-10' : 'h-8 w-8')} aria-hidden="true">
            <Icon className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
        </span>
    );
}

export function KpiTile({ label, value, hint, href, icon, tint }: { label: string; value: string | number; hint?: ReactNode; href?: string; icon: LucideIcon; tint: Tint }) {
    const body = (
        <div className="group h-full min-w-0 rounded-2xl bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5">
            <IconChip icon={icon} tint={tint} />
            <p className="label-caps mt-4">{label}</p>
            <p className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-foreground tabular-nums sm:text-[1.75rem]">{value}</p>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
    );
    return href ? <Link href={href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">{body}</Link> : body;
}

export function Card({ title, subtitle, icon, tint = 'blue', actions, children, className, flush }: { title?: string; subtitle?: string; icon?: LucideIcon; tint?: Tint; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
    return (
        <section className={cn('flex min-w-0 flex-col rounded-2xl bg-card shadow-card', className)}>
            {title && (
                <header className="flex items-start gap-3 px-5 pt-5">
                    {icon && <IconChip icon={icon} tint={tint} />}
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-foreground">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
                    </div>
                    {actions}
                </header>
            )}
            <div className={cn('flex-1', flush ? 'pt-3' : cn('px-5 pb-5', title ? 'pt-4' : 'pt-5'))}>{children}</div>
        </section>
    );
}

export const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="min-w-0"><p className="label-caps mb-1">{label}</p><div className="break-words text-sm font-medium text-foreground">{children || '—'}</div></div>
);

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">{icon || <Package className="h-6 w-6" />}</div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
            {action}
        </div>
    );
}

/** Applies list filters by updating the URL, so a filtered page can be bookmarked or reloaded. */
export function useFilters(filters: Record<string, string | undefined>) {
    return (changes: Record<string, string | undefined>) => {
        const next = { ...filters, ...changes };
        const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
        router.get(window.location.pathname, clean, { preserveState: true, preserveScroll: true, replace: true });
    };
}

export function SearchInput({ value, onChange, placeholder }: { value?: string; onChange: (value: string) => void; placeholder: string }) {
    const [text, setText] = useState(value ?? '');
    const first = useRef(true);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        const timer = setTimeout(() => onChange(text), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);
    return (
        <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={placeholder} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} className="bg-card pl-9" />
        </div>
    );
}

const ALL = '__all';
export function FilterSelect({ value, onChange, options, all, className }: { value?: string; onChange: (value: string | undefined) => void; options: Option[]; all: string; className?: string }) {
    return (
        <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
            <SelectTrigger aria-label={all} className={cn('bg-card sm:w-44', className)}><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL}>{all}</SelectItem>
                {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

export const Filters = ({ children }: { children: ReactNode }) => <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;

export function ExportButton({ href }: { href: string }) {
    return <Button asChild variant="outline" className="bg-card"><a href={`${href}${window.location.search}`}><Download className="mr-2 h-4 w-4" />Export</a></Button>;
}

export function Table({ headers, children, minWidth = 900, empty, colSpan }: { headers: (string | [string, 'right'])[]; children: ReactNode; minWidth?: number; empty?: boolean; colSpan?: number }) {
    return (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
            <table className="w-full" style={{ minWidth }}>
                <thead>
                    <tr className="border-b border-border">
                        {headers.map((h) => {
                            const [label, align] = Array.isArray(h) ? h : [h, 'left'];
                            return <th key={label} className={cn('whitespace-nowrap px-6 py-3 text-sm font-semibold text-foreground', align === 'right' ? 'text-right' : 'text-left')}>{label}</th>;
                        })}
                    </tr>
                </thead>
                <tbody>
                    {empty ? <tr><td colSpan={colSpan ?? headers.length} className="px-6 py-10 text-center text-sm text-muted-foreground">Nothing matches your filters.</td></tr> : children}
                </tbody>
            </table>
        </div>
    );
}
export const Tr = ({ children }: { children: ReactNode }) => <tr className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">{children}</tr>;
export const Td = ({ children, right, muted, className }: { children?: ReactNode; right?: boolean; muted?: boolean; className?: string }) => (
    <td className={cn('px-6 py-3.5 text-sm', right && 'text-right tabular-nums', muted ? 'text-muted-foreground' : 'text-foreground', className)}>{children}</td>
);
export const RowLink = ({ href, children, sub }: { href: string; children: ReactNode; sub?: ReactNode }) => (
    <div className="min-w-0"><Link href={href} className="whitespace-nowrap text-sm font-medium text-foreground hover:text-primary">{children}</Link>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
);

export function Pagination({ meta, label }: { meta: Paginated<unknown>; label: string }) {
    if (!meta.total) return null;
    const go = (changes: Record<string, string>) => {
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        router.get(window.location.pathname, { ...params, ...changes }, { preserveState: true, preserveScroll: false });
    };
    return (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select value={String(meta.per_page)} onValueChange={(v) => go({ per_page: v, page: '1' })}>
                    <SelectTrigger aria-label="Rows per page" className="h-8 w-[72px] bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="tabular-nums">{meta.from}–{meta.to} of {meta.total} {label}</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={meta.current_page <= 1} onClick={() => go({ page: String(meta.current_page - 1) })}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
                    <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => go({ page: String(meta.current_page + 1) })}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    );
}

/** Previous and next only: the portal has no rows-per-page control. */
export function SimplePager({ meta }: { meta: Paginated<unknown> }) {
    if (meta.last_page <= 1) return null;
    const go = (page: number) => router.get(window.location.pathname, { page }, { preserveScroll: false });
    return (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={meta.current_page <= 1} onClick={() => go(meta.current_page - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Newer</Button>
            <span className="tabular-nums">Page {meta.current_page} of {meta.last_page}</span>
            <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => go(meta.current_page + 1)}>Older<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>
    );
}

export function Field({ label, error, required, children, hint, className }: { label: string; error?: string; required?: boolean; children: ReactNode; hint?: string; className?: string }) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
            {children}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export function SelectField({ value, onChange, options, placeholder, none }: { value?: string | null; onChange: (value: string) => void; options: Option[]; placeholder?: string; none?: string }) {
    const NONE = '__none';
    return (
        <Select value={value || (none ? NONE : undefined)} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
            <SelectTrigger><SelectValue placeholder={placeholder ?? 'Select...'} /></SelectTrigger>
            <SelectContent>
                {none && <SelectItem value={NONE}>{none}</SelectItem>}
                {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

export const SubmitButton = ({ processing, children, ...props }: { processing: boolean; children: ReactNode } & React.ComponentProps<typeof Button>) => (
    <Button disabled={processing} {...props}>{processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{children}</Button>
);

/**
 * Confirmation for financial and destructive actions. With `reason` the user must say why, and that text is sent to
 * the server as `reason` for the audit trail.
 */
export function ConfirmAction({ open, onOpenChange, title, description, url, method = 'post', reason, confirmLabel = 'Confirm', destructive, data }: {
    open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; url: string; method?: 'post' | 'put' | 'delete'; reason?: string; confirmLabel?: string; destructive?: boolean; data?: Record<string, unknown>;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<Record<string, any>>({ reason: '', ...data });
    useEffect(() => { form.setData({ reason: '', ...data }); form.clearErrors(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, JSON.stringify(data)]);
    const submit = () => form.submit(method, url, { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    const errors = form.errors as Record<string, string>;
    const firstError = Object.values(errors)[0];

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                {reason && <Field label={reason} required><Textarea value={String(form.data.reason ?? '')} onChange={(e) => form.setData('reason', e.target.value)} rows={3} /></Field>}
                {firstError && <p className="text-sm text-destructive">{firstError}</p>}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <SubmitButton processing={form.processing} variant={destructive ? 'destructive' : 'default'} disabled={form.processing || (!!reason && !String(form.data.reason ?? '').trim())} onClick={submit}>{confirmLabel}</SubmitButton>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
