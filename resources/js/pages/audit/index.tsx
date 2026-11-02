import { Head } from '@inertiajs/react';
import { ChevronDown, History } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, Filters, FilterSelect, Page, Pagination, SearchInput, useFilters } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { dateTime, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated, Person } from '@/types';

interface Log { id: string; module: string; event: string; description: string; properties: Record<string, unknown> | null; ip_address: string | null; created_at: string; user: Person | null }
const TONE: Record<string, string> = { created: 'bg-emerald-50 text-emerald-700', updated: 'bg-blue-50 text-blue-700', deleted: 'bg-red-50 text-red-700', voided: 'bg-red-50 text-red-700', reversed: 'bg-red-50 text-red-700', failed_login: 'bg-red-50 text-red-700', blocked_login: 'bg-red-50 text-red-700' };

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function AuditIndex({ logs, filters, modules }: { logs: Paginated<Log>; filters: Record<string, string>; modules: string[] }) {
    const apply = useFilters(filters);
    const [open, setOpen] = useState<string | null>(null);

    return (
        <Page>
            <Head title="Audit Trail" />
            <PageHeader title="Audit Trail" description="An unchangeable record of who did what, and when" />
            <Filters>
                <SearchInput value={filters.search} onChange={(search) => apply({ search })} placeholder="Search activity..." />
                <FilterSelect value={filters.module} onChange={(module) => apply({ module })} options={modules.map((m) => ({ value: m, label: titleCase(m) }))} all="All modules" />
            </Filters>
            {logs.data.length === 0 ? <EmptyState icon={<History className="h-6 w-6" />} title="No activity found" description="Try different filters." /> : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
                    {logs.data.map((l) => {
                        const changes = (l.properties?.changes ?? null) as Record<string, { old: unknown; new: unknown }> | null;
                        const extra = l.properties ? Object.entries(l.properties).filter(([k]) => k !== 'changes') : [];
                        const expandable = !!changes || extra.length > 0;
                        return (
                            <li key={l.id}>
                                <button type="button" disabled={!expandable} aria-expanded={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 disabled:hover:bg-transparent">
                                    <span className={cn('hidden w-28 shrink-0 truncate rounded-full px-2.5 py-1 text-center text-xs font-medium sm:block', TONE[l.event] ?? 'bg-slate-100 text-slate-600')}>{titleCase(l.event)}</span>
                                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{l.description}</span><span className="block text-xs text-muted-foreground">{l.user?.name ?? 'System'} · {titleCase(l.module)} · {dateTime(l.created_at)}</span></span>
                                    {expandable && <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open === l.id && 'rotate-180')} />}
                                </button>
                                {open === l.id && (
                                    <div className="space-y-1 bg-muted/40 px-5 py-3 text-sm">
                                        {changes && Object.entries(changes).map(([field, c]) => <p key={field} className="break-words"><span className="font-medium">{titleCase(field)}:</span> <span className="text-muted-foreground line-through">{show(c.old)}</span> → {show(c.new)}</p>)}
                                        {extra.map(([k, v]) => <p key={k} className="break-words"><span className="font-medium">{titleCase(k)}:</span> {show(v)}</p>)}
                                        {l.ip_address && <p className="text-xs text-muted-foreground">IP {l.ip_address}</p>}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            <Pagination meta={logs} label="entries" />
        </Page>
    );
}
