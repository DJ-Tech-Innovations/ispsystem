import { Link, useForm } from '@inertiajs/react';
import { CheckCircle2, Gauge, Headphones, Infinity, MapPin, Search, Wifi, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Field, SelectField, SubmitButton } from '@/components/app/kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface Plan { name: string; code: string; description: string | null; speed_description: string; monthly_price: string; installation_fee: string }

/** The curved edge from the client's poster: a white sweep with an orange line riding on it. */
export const Swoosh = () => (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 w-full sm:h-16 lg:h-20" viewBox="0 0 1440 80" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M0 62 C 380 96, 980 -8, 1440 26 V80 H0 Z" fill="hsl(var(--background))" />
        <path d="M0 62 C 380 96, 980 -8, 1440 26" stroke="#E76131" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <path d="M0 50 C 380 84, 980 -20, 1440 14" stroke="#6A7FEB" strokeOpacity=".5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
);

/** The row of dots under the logo's wordmark, used as the site's rule. */
export const Dots = ({ className }: { className?: string }) => (
    <span className={cn('mt-4 flex items-center gap-1.5', className)} aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === 8 ? 'bg-ember-500' : 'bg-royal-900')} />)}
    </span>
);

/** The band every inner page opens with. */
export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <section className="keep-light relative isolate overflow-hidden bg-royal-950 text-white">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-royal-900 via-royal-700 to-royal-900" aria-hidden="true">
                <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px]" />
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-32 sm:pt-20">
                <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">{title}</h1>
                {subtitle && <p className="mt-4 max-w-2xl text-base text-royal-100/80 sm:text-lg">{subtitle}</p>}
            </div>
            <Swoosh />
        </section>
    );
}

export const Section = ({ children, className, id }: { children: ReactNode; className?: string; id?: string }) => (
    <section id={id} className={cn('mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20', className)}>{children}</section>
);

export const SectionTitle = ({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) => (
    <div className="mb-10 max-w-2xl">
        {eyebrow && <p className="mb-2 text-sm font-bold uppercase tracking-wider text-ember-600">{eyebrow}</p>}
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2>
        <Dots />
        {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
    </div>
);

/** Reads "Up to 100 Mbps" into 100, or null when a plan's speed is written some other way. */
export const mbpsOf = (plan: Plan) => {
    const match = plan.speed_description.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(g|m)bps/i);
    return match ? Number(match[1]) * (match[2].toLowerCase() === 'g' ? 1000 : 1) : null;
};

/** Whatever follows the speed, such as the "Unlimited" in "50 Mbps Unlimited". */
export const speedNote = (plan: Plan) => plan.speed_description.replace(/^.*?bps\s*/i, '').trim();

export const peso = (value: string | number) => money(value).replace('.00', '');

export function PlanCards({ plans, highlight }: { plans: Plan[]; highlight?: string | null }) {
    if (plans.length === 0) return <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">Our plans are being updated. <Link href="/contact" className="font-medium text-primary hover:underline">Contact us</Link> for current rates.</p>;
    const top = Math.max(...plans.map((p) => mbpsOf(p) ?? 0), 1);
    return (
        <div className={cn('grid gap-5 sm:grid-cols-2', plans.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {plans.map((p) => {
                const mbps = mbpsOf(p);
                const picked = highlight === p.code;
                return (
                    <article key={p.code} className={cn('relative flex flex-col rounded-3xl bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover', picked && 'ring-2 ring-ember-500')}>
                        {picked && <span className="absolute -top-3 left-6 rounded-full bg-ember-500 px-3 py-1 text-xs font-bold text-royal-950">Suggested for you</span>}
                        <h3 className="font-semibold">{p.name}</h3>
                        {mbps ? <p className="mt-3 font-display text-5xl font-bold tracking-tight tabular-nums">{mbps}<span className="ml-1 text-base font-semibold text-muted-foreground">Mbps</span></p> : <p className="mt-3 font-display text-2xl font-bold">{p.speed_description}</p>}
                        {mbps && speedNote(p) && <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ember-600">{speedNote(p)}</p>}
                        {mbps && <div className="mt-3 h-1.5 rounded-full bg-royal-50" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-royal-600 to-ember-500" style={{ width: `${Math.max(8, (mbps / top) * 100)}%` }} /></div>}
                        <p className="mt-4 flex-1 text-sm text-muted-foreground">{p.description}</p>
                        <p className="mt-5 text-2xl font-bold tracking-tight tabular-nums">{peso(p.monthly_price)}<span className="text-sm font-normal text-muted-foreground"> /month</span></p>
                        <p className="mt-1 text-xs text-muted-foreground">{Number(p.installation_fee) > 0 ? `${peso(p.installation_fee)} installation` : 'Free installation'}</p>
                        <Button asChild className={cn('mt-4 w-full font-semibold', picked && 'bg-ember-500 text-royal-950 hover:bg-ember-400')}><Link href={`/contact?plan=${encodeURIComponent(p.code)}`}>Choose {p.name}</Link></Button>
                    </article>
                );
            })}
        </div>
    );
}

const BENEFIT_ICONS: LucideIcon[] = [Gauge, Wifi, Infinity, Headphones];
export function Benefits({ items }: { items: { title: string; body: string }[] }) {
    // Four items fill a staggered 2-1 / 1-2 layout; any other count falls back to even columns.
    const bento = items.length === 4;
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {items.map((b, i) => {
                const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
                const dark = bento && i === 0;
                return (
                    <div key={b.title} className={cn('rounded-3xl p-7', bento && (i === 0 || i === 3) && 'md:col-span-2', dark ? 'keep-light bg-gradient-to-br from-royal-900 to-royal-700 text-white' : 'bg-background ring-1 ring-inset ring-border')}>
                        <Icon className={cn('h-7 w-7', dark ? 'text-ember-300' : 'text-ember-500')} />
                        <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{b.title}</h3>
                        <p className={cn('mt-1.5 max-w-md text-sm', dark ? 'text-royal-100/80' : 'text-muted-foreground')}>{b.body}</p>
                    </div>
                );
            })}
        </div>
    );
}

export function Areas({ areas }: { areas: string[] }) {
    if (areas.length === 0) return <p className="text-sm text-muted-foreground">Ask us about your address and we will check it for you.</p>;
    return <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{areas.map((a) => <li key={a} className="flex items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-medium shadow-card"><MapPin className="h-4 w-4 shrink-0 text-primary" />{a}</li>)}</ul>;
}

const plain = (text: string) => text.toLowerCase().replace(/\b(brgy|bgy|barangay)\b\.?/g, '').replace(/\s+/g, ' ').trim();

/** Instant answer from the areas listed in Website settings. A miss still leads somewhere: the inquiry form. */
export function CoverageChecker({ areas }: { areas: string[] }) {
    const [query, setQuery] = useState('');
    const term = plain(query);
    const matches = term.length < 2 ? [] : areas.filter((a) => plain(a).includes(term));
    if (areas.length === 0) return <Areas areas={areas} />;

    return (
        <div>
            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Your barangay" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type your barangay..." className="h-14 rounded-2xl bg-card pl-12 text-base shadow-card" />
            </div>
            <div aria-live="polite" className="mt-3 max-w-xl empty:hidden">
                {term.length >= 2 && (matches.length > 0 ? (
                    <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /><span>Good news, we serve {matches[0]}. <Link href="/contact" className="underline">Get connected</Link></span></p>
                ) : (
                    <p className="rounded-2xl bg-ember-50 px-4 py-3 text-sm font-medium text-ember-800">It's not on our list yet, but we're growing. <Link href="/contact" className="underline">Ask about your area</Link></p>
                ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">{areas.map((a) => <li key={a} className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors', matches.includes(a) ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-card text-muted-foreground ring-border')}>{a}</li>)}</ul>
        </div>
    );
}

/** Eases content in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); observer.disconnect(); } }, { threshold: 0.12 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cn('reveal', seen && 'reveal-in', className)}>{children}</div>;
}

export function InquiryForm({ plans, selectedPlan, sent }: { plans: Plan[]; selectedPlan?: string | null; sent: boolean }) {
    const form = useForm({ name: '', mobile: '', email: '', address: '', plan: selectedPlan ?? '', message: '', consent: false, website: '' });
    const submit = (e: FormEvent) => { e.preventDefault(); form.post('/contact', { preserveScroll: true, onSuccess: () => form.reset() }); };

    if (sent) {
        return (
            <div role="status" className="rounded-2xl bg-card p-8 text-center shadow-card">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h3 className="mt-3 text-lg font-semibold">Thanks, we got your inquiry</h3>
                <p className="mt-1 text-sm text-muted-foreground">Our team will contact you soon about coverage and next steps.</p>
            </div>
        );
    }
    return (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={form.errors.name}><Input autoComplete="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></Field>
                <Field label="Mobile number" required error={form.errors.mobile}><Input autoComplete="tel" inputMode="tel" value={form.data.mobile} onChange={(e) => form.setData('mobile', e.target.value)} /></Field>
            </div>
            <Field label="Email" error={form.errors.email}><Input type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} /></Field>
            <Field label="Installation address" required error={form.errors.address}><Input autoComplete="street-address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} /></Field>
            {plans.length > 0 && <Field label="Interested plan" error={form.errors.plan}><SelectField value={form.data.plan} none="Not sure yet" onChange={(v) => form.setData('plan', v)} options={plans.map((p) => ({ value: p.code, label: `${p.name} · ${money(p.monthly_price).replace('.00', '')}` }))} /></Field>}
            <Field label="Message" error={form.errors.message}><Textarea rows={3} value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} /></Field>
            {/* Hidden from people; bots fill it in. */}
            <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} /></label></div>
            <div>
                <label className="flex items-start gap-2 text-sm text-muted-foreground"><Checkbox className="mt-0.5" checked={form.data.consent} onCheckedChange={(v) => form.setData('consent', v === true)} /><span>I agree to be contacted about this inquiry, as described in the <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Notice</Link>.</span></label>
                {form.errors.consent && <p className="mt-1 text-xs text-destructive">{form.errors.consent}</p>}
            </div>
            <SubmitButton type="submit" className="h-11 w-full bg-ember-500 font-semibold text-royal-950 hover:bg-ember-400" processing={form.processing}>Send Inquiry</SubmitButton>
        </form>
    );
}
