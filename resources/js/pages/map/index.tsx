import { Head, Link, router } from '@inertiajs/react';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { Card, Filters, FilterSelect, Page, useFilters } from '@/components/app/kit';
import { baseMap, PHILIPPINES } from '@/components/app/LocationMap';
import { PageHeader } from '@/components/app/PageHeader';
import { useShared } from '@/hooks/use-shared';
import { titleCase } from '@/lib/format';

interface Pin { id: string; reference: string; name: string; status: string; service_address: string; latitude: number; longitude: number; geo_stale: boolean }
interface Props { pins: Pin[]; filters: Record<string, string>; totals: { pinned: number; all: number; review: number } }

const COLORS: Record<string, string> = { active: '#059669', suspended: '#dc2626', for_installation: '#7c3aed', registered: '#2563eb', inquiry: '#d97706', terminated: '#64748b' };

export default function CustomerMap({ pins, filters, totals }: Props) {
    const { enums } = useShared();
    const apply = useFilters(filters);
    const element = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const layer = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!element.current) return;
        const instance = baseMap(element.current).setView(PHILIPPINES, 6);
        map.current = instance;
        layer.current = L.layerGroup().addTo(instance);
        return () => { instance.remove(); map.current = null; };
    }, []);

    useEffect(() => {
        if (!map.current || !layer.current) return;
        layer.current.clearLayers();
        pins.forEach((pin) => {
            // Built from DOM nodes, so a name can never inject markup into the popup.
            const popup = document.createElement('div');
            const title = document.createElement('a');
            title.textContent = pin.name;
            title.href = `/admin/customers/${pin.id}`;
            title.style.fontWeight = '600';
            title.onclick = (e) => { e.preventDefault(); router.visit(title.getAttribute('href') as string); };
            const meta = document.createElement('div');
            meta.textContent = `${pin.reference} · ${titleCase(pin.status)}`;
            const address = document.createElement('div');
            address.textContent = pin.service_address;
            popup.append(title, meta, address);
            L.circleMarker([pin.latitude, pin.longitude], { radius: 7, color: '#fff', weight: 2, fillColor: COLORS[pin.status] ?? '#64748b', fillOpacity: 0.95 }).bindPopup(popup).addTo(layer.current as L.LayerGroup);
        });
        if (pins.length) map.current.fitBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]), { padding: [40, 40], maxZoom: 16 });
    }, [pins]);

    return (
        <Page>
            <Head title="Customer Map" />
            <PageHeader title="Customer Map" description={`${totals.pinned} of ${totals.all} customers are pinned`} />
            <Filters>
                <FilterSelect value={filters.status} onChange={(status) => apply({ status })} options={enums.customerStatus} all="All statuses" />
                {totals.pinned < totals.all && <Link href="/admin/customers?location=missing" className="text-sm font-medium text-primary hover:underline">{totals.all - totals.pinned} without a pin</Link>}
                {totals.review > 0 && <Link href="/admin/customers?location=review" className="text-sm font-medium text-amber-700 hover:underline">{totals.review} to check</Link>}
            </Filters>
            <Card flush>
                <div ref={element} role="application" aria-label="Map of customers" className="relative z-0 h-[65vh] min-h-96 w-full overflow-hidden rounded-t-2xl" />
                <ul className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 text-xs text-muted-foreground">
                    {Object.entries(COLORS).map(([status, color]) => <li key={status} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />{titleCase(status)}</li>)}
                </ul>
            </Card>
        </Page>
    );
}
