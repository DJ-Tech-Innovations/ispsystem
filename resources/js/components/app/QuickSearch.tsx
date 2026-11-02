import { router } from '@inertiajs/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

type Results = Record<string, { title: string; subtitle: string; url: string }[]>;

/** Header search (Ctrl/⌘ K). The server only searches modules the user can open. */
export function QuickSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Results>({});
    const [loading, setLoading] = useState(false);
    const latest = useRef(0);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) { setResults({}); return; }
        const id = ++latest.current;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/admin/search?q=${encodeURIComponent(term)}`, { headers: { Accept: 'application/json' } });
                if (id === latest.current) setResults(res.ok ? await res.json() : {});
            } finally {
                if (id === latest.current) setLoading(false);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [query]);

    const go = (url: string) => { setOpen(false); setQuery(''); router.visit(url); };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-56">
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden flex-1 text-left sm:inline">Search...</span>
                <kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium sm:inline">⌘K</kbd>
                <span className="sr-only sm:hidden">Search</span>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <div className="[&_[cmdk-root]]:bg-transparent">
                    <CommandInput placeholder="Search customers, invoices, tickets..." value={query} onValueChange={setQuery} />
                </div>
                <CommandList>
                    {loading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
                    {!loading && <CommandEmpty>{query.trim().length < 2 ? 'Type at least 2 characters.' : 'No matches found.'}</CommandEmpty>}
                    {Object.entries(results).map(([group, items]) => (
                        <CommandGroup key={group} heading={group}>
                            {items.map((item) => (
                                <CommandItem key={item.url} value={`${group} ${item.title} ${item.subtitle} ${query}`} onSelect={() => go(item.url)} className="flex-col items-start gap-0">
                                    <span className="text-sm font-medium">{item.title}</span>
                                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}
                </CommandList>
            </CommandDialog>
        </>
    );
}
