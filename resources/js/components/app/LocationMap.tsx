import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export const PHILIPPINES: [number, number] = [12.5, 122.5];

export function baseMap(element: HTMLElement) {
    const map = L.map(element, { preferCanvas: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    return map;
}

// A drawn pin: Leaflet's stock image paths don't survive bundling.
const PIN = L.divIcon({
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    html: '<svg width="28" height="38" viewBox="0 0 28 38"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.4 14 38 14 38s14-13.6 14-24.1C28 6.2 21.7 0 14 0z" fill="#2563eb" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>',
});

export interface Point { lat: number; lng: number }

/** One pin. When editable, a click or a drag moves it; `onChange` hears about it. */
export function LocationMap({ value, editable, onChange }: { value: Point | null; editable: boolean; onChange?: (point: Point) => void }) {
    const element = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const marker = useRef<L.Marker | null>(null);
    const changed = useRef(onChange);
    changed.current = onChange;

    useEffect(() => {
        if (!element.current) return;
        const instance = baseMap(element.current);
        map.current = instance;
        instance.setView(value ? [value.lat, value.lng] : PHILIPPINES, value ? 17 : 5);
        if (editable) instance.on('click', (e: L.LeafletMouseEvent) => changed.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
        return () => { instance.remove(); map.current = null; marker.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editable]);

    useEffect(() => {
        const instance = map.current;
        if (!instance) return;
        if (!value) { marker.current?.remove(); marker.current = null; return; }
        if (marker.current) marker.current.setLatLng([value.lat, value.lng]);
        else {
            const pin = L.marker([value.lat, value.lng], { icon: PIN, draggable: editable, keyboard: editable, title: 'Service address' }).addTo(instance);
            pin.on('dragend', () => { const p = pin.getLatLng(); changed.current?.({ lat: p.lat, lng: p.lng }); });
            marker.current = pin;
        }
        if (!instance.getBounds().contains([value.lat, value.lng]) || instance.getZoom() < 15) instance.setView([value.lat, value.lng], 17);
    }, [value?.lat, value?.lng, editable]); // eslint-disable-line react-hooks/exhaustive-deps

    return <div ref={element} role="application" aria-label={editable ? 'Map. Click to place the pin, or drag it.' : 'Map showing the service address'} className="relative z-0 h-64 w-full overflow-hidden rounded-xl" />;
}
