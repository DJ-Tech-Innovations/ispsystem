import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface PickedCustomer {
    id: string; name: string; reference: string; service_address: string;
    subscriptions: { id: string; reference: string; plan: string | null; address: string; status: string }[];
}

/** Type-ahead customer search, so forms stay fast with thousands of subscribers. */
export function CustomerPicker({ value, onChange }: { value: PickedCustomer | null; onChange: (customer: PickedCustomer) => void }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<PickedCustomer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const timer = setTimeout(async () => {
            const res = await fetch(`/admin/lookup/customers?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
            setItems(res.ok ? await res.json() : []);
            setLoading(false);
        }, 200);
        return () => clearTimeout(timer);
    }, [query, open]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal>
            <PopoverTrigger asChild>
                <button type="button" role="combobox" aria-expanded={open} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <span className={cn('truncate', !value && 'text-muted-foreground')}>{value ? `${value.name} (${value.reference})` : 'Search for a customer...'}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="Name, reference or mobile..." value={query} onValueChange={setQuery} />
                    <CommandList>
                        {loading ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div> : <CommandEmpty>No customers found.</CommandEmpty>}
                        {!loading && items.map((c) => (
                            <CommandItem key={c.id} value={c.id} onSelect={() => { onChange(c); setOpen(false); }}>
                                <Check className={cn('mr-2 h-4 w-4', value?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                                <span className="truncate">{c.name}</span>
                                <span className="ml-auto pl-2 text-xs text-muted-foreground">{c.reference}</span>
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
