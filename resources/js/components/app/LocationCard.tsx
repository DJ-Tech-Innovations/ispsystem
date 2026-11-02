import { useForm } from '@inertiajs/react';
import { Crosshair, ExternalLink, MapPin, Navigation, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, ConfirmAction, SubmitButton } from '@/components/app/kit';
import { LocationMap, type Point } from '@/components/app/LocationMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dateTime, titleCase } from '@/lib/format';

interface Location { latitude: number | null; longitude: number | null; geo_source?: string | null; geo_accuracy?: number | null; geo_stale?: boolean; geo_tagged_at?: string | null }

/** Reads "14.65, 121.04" or a Google Maps link. */
export function parseCoordinates(text: string): Point | null {
    const match = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? text.match(/(-?\d{1,2}\.\d+)\s*[,\s]\s*(-?\d{2,3}\.\d+)/);
    return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
}

export function LocationCard({ location, updateUrl, editable, clearable, taggedBy }: { location: Location; updateUrl: string; editable: boolean; clearable?: boolean; taggedBy?: string }) {
    const saved = location.latitude !== null ? { lat: location.latitude, lng: location.longitude as number } : null;
    const [point, setPoint] = useState<Point | null>(saved);
    const [editing, setEditing] = useState(false);
    const [paste, setPaste] = useState('');
    const [locating, setLocating] = useState(false);
    const [removing, setRemoving] = useState(false);
    const form = useForm({ latitude: 0, longitude: 0, source: 'map', accuracy: null as number | null });
    const errors = form.errors as Record<string, string>;

    useEffect(() => { setPoint(saved); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [location.latitude, location.longitude]);

    const place = (next: Point, source: string, accuracy: number | null = null) => {
        setPoint(next);
        form.setData({ latitude: next.lat, longitude: next.lng, source, accuracy });
    };
    const useDevice = () => {
        if (!window.isSecureContext || !navigator.geolocation) { toast.error('Device location needs the secure (https) address of this site.'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setLocating(false); place({ lat: p.coords.latitude, lng: p.coords.longitude }, 'gps', p.coords.accuracy); },
            () => { setLocating(false); toast.error("Couldn't get your location. Check that location is allowed for this site."); },
            { enableHighAccuracy: true, timeout: 15000 },
        );
    };
    const applyPaste = (text: string) => {
        setPaste(text);
        const parsed = parseCoordinates(text);
        if (parsed) place(parsed, 'coordinates');
    };
    const cancel = () => { setEditing(false); setPoint(saved); setPaste(''); form.clearErrors(); };
    const save = () => form.put(updateUrl, { preserveScroll: true, onSuccess: () => { setEditing(false); setPaste(''); } });
    const dirty = editing && !!point && (point.lat !== saved?.lat || point.lng !== saved?.lng);

    return (
        <Card title="Location" subtitle={saved ? `${saved.lat.toFixed(6)}, ${saved.lng.toFixed(6)}` : 'No pin on this address yet'} icon={MapPin} tint="teal">
            {location.geo_stale && <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"><TriangleAlert className="h-4 w-4 shrink-0" />The address changed after this pin was placed. Please check it.</p>}
            <LocationMap value={point} editable={editing} onChange={(next) => place(next, 'map')} />

            {saved && !editing && (
                <>
                    <p className="mt-2 text-xs text-muted-foreground">{titleCase(location.geo_source ?? 'map')}{location.geo_accuracy ? ` · about ${location.geo_accuracy} m` : ''}{location.geo_tagged_at ? ` · ${dateTime(location.geo_tagged_at)}` : ''}{taggedBy ? ` · ${taggedBy}` : ''}</p>
                    <Button asChild variant="outline" size="sm" className="mt-3 w-full"><a href={`https://www.google.com/maps/dir/?api=1&destination=${saved.lat},${saved.lng}`} target="_blank" rel="noreferrer"><Navigation className="mr-2 h-4 w-4" />Directions<ExternalLink className="ml-2 h-3 w-3" /></a></Button>
                </>
            )}

            {editing && (
                <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Click the map or drag the pin. Zoom in to place it on the right house.</p>
                    <Button type="button" variant="outline" size="sm" className="w-full" disabled={locating} onClick={useDevice}><Crosshair className="mr-2 h-4 w-4" />{locating ? 'Finding you...' : 'Use my current location'}</Button>
                    <Input aria-label="Coordinates or Google Maps link" placeholder="Paste coordinates or a Google Maps link" value={paste} onChange={(e) => applyPaste(e.target.value)} />
                    {paste && !parseCoordinates(paste) && <p className="text-xs text-destructive">No coordinates found in that text.</p>}
                    {form.data.accuracy !== null && form.data.accuracy > 100 && <p className="text-xs text-amber-700">Your device is only accurate to about {Math.round(form.data.accuracy)} m. Check the pin before saving.</p>}
                    {(errors.latitude || errors.longitude) && <p className="text-xs text-destructive">{errors.latitude || errors.longitude}</p>}
                    <div className="flex gap-2">
                        <SubmitButton type="button" size="sm" className="flex-1" processing={form.processing} disabled={form.processing || !dirty} onClick={save}>Save Pin</SubmitButton>
                        <Button type="button" variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
                    </div>
                </div>
            )}

            {editable && !editing && (
                <div className="mt-2 flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setEditing(true)}><MapPin className="mr-2 h-4 w-4" />{saved ? 'Move Pin' : 'Add Pin'}</Button>
                    {saved && clearable && <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRemoving(true)}>Remove</Button>}
                </div>
            )}
            <ConfirmAction open={removing} onOpenChange={setRemoving} title="Remove this pin?" description="The address stays. Only the map location is removed." url={updateUrl} method="delete" confirmLabel="Remove" destructive />
        </Card>
    );
}
