import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, ClipboardList, Gamepad2, Globe, Megaphone, MonitorPlay, Phone, Plug, Router, Search, Tv, Video, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Benefits, CoverageChecker, InquiryForm, mbpsOf, peso, PlanCards, Reveal, Section, SectionTitle, speedNote, type Plan } from '@/components/app/site';
import { HeroCarousel, PromoSlide, type Slide } from '@/components/app/HeroCarousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    plans: Plan[]; slides: Slide[]; announcements: { title: string; body: string }[]; inquirySent: boolean; contact: { phone: string; phone2: string; messenger: string | null };
    content: { hero_title: string; hero_subtitle: string; benefits: { title: string; body: string }[]; coverage_intro: string; coverage_areas: string[] };
}

const amberButton = 'bg-ember-500 font-semibold text-royal-950 shadow-lg shadow-ember-500/20 hover:bg-ember-400';

const STRANDS = [
    'M-20 340 C 240 340, 300 120, 620 150 S 900 90, 1240 60',
    'M-20 400 C 280 400, 380 210, 660 230 S 960 170, 1240 150',
    'M-20 460 C 300 470, 440 300, 700 310 S 1000 260, 1240 240',
    'M-20 280 C 200 270, 260 60, 560 70 S 880 30, 1240 -10',
    'M-20 520 C 320 530, 500 380, 760 390 S 1040 340, 1240 330',
    'M-20 220 C 160 210, 220 10, 500 10 S 860 -20, 1240 -60',
];

/** The signature: the faster the selected plan, the more strands light up and the quicker the light travels. */
function FiberLines({ level }: { level: number }) {
    const lit = Math.max(2, Math.round(level * STRANDS.length));
    const duration = 6 - level * 4.6;
    return (
        <svg className="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
            {STRANDS.map((d, i) => (
                <g key={d}>
                    <path d={d} stroke="#6A7FEB" strokeOpacity=".2" strokeWidth="1.5" />
                    {i < lit && <path d={d} stroke={i % 2 ? '#F7A070' : '#9AA9F5'} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="70 1390" className="fiber-pulse" style={{ animationDuration: `${duration}s`, animationDelay: `${-i * 0.9}s` }} />}
                </g>
            ))}
        </svg>
    );
}

/** Rolls a number up or down to its new value. */
function useRolling(target: number) {
    const [value, setValue] = useState(target);
    const from = useRef(target);
    useEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); from.current = target; return; }
        const start = performance.now();
        const begin = from.current;
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 450);
            const next = Math.round(begin + (target - begin) * (1 - (1 - t) ** 3));
            setValue(next);
            from.current = next;
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return value;
}

function SpeedConsole({ plans, selected, onSelect }: { plans: Plan[]; selected: Plan; onSelect: (plan: Plan) => void }) {
    const mbps = mbpsOf(selected);
    const top = Math.max(...plans.map((p) => mbpsOf(p) ?? 0), 1);
    const rolling = useRolling(mbps ?? 0);

    return (
        <div className="rounded-[2rem] bg-white/[0.07] p-6 ring-1 ring-inset ring-white/15 backdrop-blur-md sm:p-8">
            <p className="text-sm font-medium text-royal-100/80">Pick a speed and watch the line</p>
            <div role="radiogroup" aria-label="Internet plan" className="mt-3 grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-royal-950/60 p-1">
                {plans.map((p) => (
                    <button key={p.code} type="button" role="radio" aria-checked={p.code === selected.code} aria-label={p.name} onClick={() => onSelect(p)} className={cn('rounded-xl px-2 py-2.5 text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300', p.code === selected.code ? 'bg-ember-500 text-royal-950' : 'text-royal-100/80 hover:text-white')}>
                        {mbpsOf(p) ?? p.name}
                    </button>
                ))}
            </div>
            <div aria-live="polite">
                {mbps ? <p className="mt-6 font-display text-7xl font-bold leading-none tracking-tight tabular-nums sm:text-8xl">{rolling}<span className="ml-2 text-2xl font-semibold tracking-normal text-ember-300">Mbps</span></p> : <p className="mt-6 font-display text-3xl font-bold">{selected.speed_description}</p>}
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-royal-300 to-ember-400 transition-[width] duration-500 ease-out" style={{ width: `${Math.max(8, ((mbps ?? 0) / top) * 100)}%` }} /></div>
                <div className="mt-5 flex items-end justify-between gap-4">
                    <div className="min-w-0"><p className="truncate font-semibold">{selected.name}{speedNote(selected) && <span className="ml-2 text-xs font-bold uppercase tracking-wide text-ember-300">{speedNote(selected)}</span>}</p><p className="text-xs text-royal-100/70">{Number(selected.installation_fee) > 0 ? `${peso(selected.installation_fee)} installation` : 'Free installation'}</p></div>
                    <p className="shrink-0 text-2xl font-bold tabular-nums">{peso(selected.monthly_price)}<span className="text-sm font-normal text-royal-100/70">/mo</span></p>
                </div>
            </div>
            <Button asChild size="lg" className={cn('mt-5 h-12 w-full', amberButton)}><Link href={`/contact?plan=${encodeURIComponent(selected.code)}`}>Get {selected.name}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
    );
}

const USES: { key: string; label: string; icon: LucideIcon; mbps: number }[] = [
    { key: 'browse', label: 'Browsing & social', icon: Globe, mbps: 3 },
    { key: 'calls', label: 'Video calls', icon: Video, mbps: 5 },
    { key: 'games', label: 'Online games', icon: Gamepad2, mbps: 5 },
    { key: 'hd', label: 'HD streaming', icon: MonitorPlay, mbps: 8 },
    { key: '4k', label: '4K streaming', icon: Tv, mbps: 25 },
];

/** A friendly rule of thumb: everyone online at once, each doing the heaviest thing on the list. */
function SpeedFinder({ plans, onSuggest }: { plans: Plan[]; onSuggest: (code: string | null) => void }) {
    const [people, setPeople] = useState(3);
    const [uses, setUses] = useState<string[]>(['browse', 'hd']);
    const need = people * Math.max(...USES.filter((u) => uses.includes(u.key)).map((u) => u.mbps), 3);
    const ranked = useMemo(() => [...plans].filter((p) => mbpsOf(p)).sort((a, b) => mbpsOf(a)! - mbpsOf(b)!), [plans]);
    const suggestion = ranked.find((p) => mbpsOf(p)! >= need) ?? ranked[ranked.length - 1];
    const code = suggestion?.code ?? null;
    useEffect(() => onSuggest(code), [code, onSuggest]);
    if (!suggestion) return null;

    return (
        <div className="keep-light grid overflow-hidden rounded-[2rem] bg-royal-900 text-white shadow-card lg:grid-cols-[1.25fr_1fr]">
            <div className="p-6 sm:p-10">
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">How much speed do you need?</h2>
                <label className="mt-8 block">
                    <span className="flex items-baseline justify-between text-sm font-medium text-royal-100">People online at the same time<output className="font-display text-3xl font-bold text-ember-300">{people}</output></span>
                    <input type="range" min={1} max={10} value={people} onChange={(e) => setPeople(Number(e.target.value))} className="speed-slider mt-3 w-full cursor-pointer" />
                </label>
                <fieldset className="mt-7">
                    <legend className="text-sm font-medium text-royal-100">What do you do online?</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {USES.map((u) => {
                            const on = uses.includes(u.key);
                            return <button key={u.key} type="button" aria-pressed={on} onClick={() => setUses(on ? uses.filter((x) => x !== u.key) : [...uses, u.key])} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300', on ? 'bg-white text-royal-950 ring-white' : 'text-royal-100 ring-white/25 hover:bg-white/10')}><u.icon className="h-4 w-4" />{u.label}</button>;
                        })}
                    </div>
                </fieldset>
            </div>
            <div aria-live="polite" className="flex flex-col justify-center bg-gradient-to-br from-royal-600 to-royal-800 p-6 sm:p-10">
                <p className="text-sm font-medium text-royal-100">We'd suggest</p>
                <p className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">{suggestion.name}</p>
                <p className="mt-2 text-royal-100">{suggestion.speed_description} · {peso(suggestion.monthly_price)}/month</p>
                <p className="mt-4 text-xs text-royal-100/70">{mbpsOf(suggestion)! < need ? 'Our fastest listed plan. Ask us about bigger needs.' : `A rough guide for about ${need} Mbps at peak. Actual needs vary.`}</p>
                <Button asChild size="lg" className={cn('mt-6 w-full sm:w-auto sm:self-start', amberButton)}><Link href={`/contact?plan=${encodeURIComponent(suggestion.code)}`}>Choose this plan</Link></Button>
            </div>
        </div>
    );
}

function CoverageRibbon({ areas }: { areas: string[] }) {
    // A moving band needs a few names. One or two would just repeat themselves.
    if (areas.length < 3) return null;
    const row = (hidden: boolean) => <ul aria-hidden={hidden} className="flex shrink-0 items-center">{Array.from({ length: Math.ceil(16 / areas.length) }).flatMap((_, n) => areas.map((a) => <li key={`${n}${a}`} className="flex items-center gap-6 whitespace-nowrap pr-6 font-semibold"><span>{a}</span><span className="h-1.5 w-1.5 rounded-full bg-royal-950/40" aria-hidden="true" /></li>))}</ul>;
    return <div className="ribbon keep-light overflow-hidden bg-ember-500 py-3 text-sm text-royal-950" aria-label="Areas we serve"><div className="ribbon-track flex w-max">{row(false)}{row(true)}</div></div>;
}

const STEPS = [
    [Search, 'Send an inquiry', 'Tell us your address and the plan you like.'],
    [ClipboardList, 'We confirm coverage', 'Our team checks your area and sets a schedule.'],
    [Plug, 'We install', 'A technician connects and tests your service.'],
    [Router, 'You go online', 'Manage billing and support from your portal.'],
] as const;

export default function Home({ plans, announcements, content, slides, inquirySent, contact }: Props) {
    const [selected, setSelected] = useState<Plan | undefined>(plans[Math.floor((plans.length - 1) / 2)]);
    const [suggested, setSuggested] = useState<string | null>(null);
    const [showBar, setShowBar] = useState(false);
    const inquireRef = useRef<HTMLDivElement>(null);
    const speeds = plans.map((p) => mbpsOf(p) ?? 0);
    const level = selected ? (mbpsOf(selected) ?? 0) / Math.max(...speeds, 1) : 0.4;
    const lowest = plans.length ? Math.min(...plans.map((p) => Number(p.monthly_price))) : null;
    const words = content.hero_title.trim().split(' ');
    // Two words of emphasis reads as a phrase; a lone last word can land on something like "on".
    const accent = words.splice(words.length > 3 ? -2 : -1).join(' ');

    // Phones get a sticky call to action once the hero is gone, until the form itself is on screen.
    useEffect(() => {
        const update = () => {
            const form = inquireRef.current?.getBoundingClientRect().top ?? Infinity;
            setShowBar(window.scrollY > window.innerHeight * 0.8 && form > window.innerHeight);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    return (
        <>
            <Head title="Home" />
            {announcements.map((a) => (
                <div key={a.title} className="border-b border-ember-200 bg-ember-50 text-ember-900">
                    <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2.5 text-sm sm:px-6"><Megaphone className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="font-semibold">{a.title}:</strong> {a.body}</span></p>
                </div>
            ))}

            <HeroCarousel
                backdrop={<FiberLines level={level} />}
                slides={[
                    {
                        key: 'speed',
                        content: (
                            <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
                                <div>
                                    <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">{words.join(' ')} <span className="text-ember-300">{accent}</span></h1>
                                    <p className="mt-6 max-w-lg text-lg text-royal-100/85">{content.hero_subtitle}</p>
                                    {/* On phones the speed picker takes this spot, so it shows without scrolling. */}
                                    <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
                                        <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href="#coverage">Check My Area</a></Button>
                                        {[contact.phone, contact.phone2].filter(Boolean).map((phone) => <Button key={phone} asChild size="lg" variant="ghost" className="h-12 px-3 text-royal-100 hover:bg-white/10 hover:text-white"><a href={`tel:${phone}`}><Phone className="mr-2 h-4 w-4" />{phone}</a></Button>)}
                                    </div>
                                    {lowest !== null && <p className="mt-6 hidden items-center gap-2 text-sm text-royal-100/80 lg:flex"><Check className="h-4 w-4 text-ember-300" />Plans from {peso(lowest)} a month</p>}
                                </div>
                                {selected ? <div data-stops-carousel><SpeedConsole plans={plans} selected={selected} onSelect={setSelected} /></div> : null}
                            </div>
                        ),
                    },
                    ...slides.map((slide, i) => ({ key: `custom-${i}`, image: slide.image, content: <PromoSlide slide={slide} index={i} /> })),
                ]}
            />

            <CoverageRibbon areas={content.coverage_areas} />

            <Section className="pb-0 sm:pb-0"><Reveal><SpeedFinder plans={plans} onSuggest={setSuggested} /></Reveal></Section>

            <Section id="plans">
                <Reveal><SectionTitle eyebrow="Internet plans" title="One flat price. No guesswork." subtitle="Pick what fits your home or business." /></Reveal>
                <Reveal delay={80}><PlanCards plans={plans} highlight={suggested} /></Reveal>
            </Section>

            <div className="bg-card"><Section><Reveal><SectionTitle eyebrow="Why choose us" title="Reliable service, close to home" /></Reveal><Reveal delay={80}><Benefits items={content.benefits} /></Reveal></Section></div>

            <Section>
                <Reveal><SectionTitle eyebrow="How to subscribe" title="Online in four steps" /></Reveal>
                <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
                    {/* The steps sit on a strand of fiber, so the page keeps its one visual idea. */}
                    <span className="absolute left-5 top-5 hidden h-0.5 w-3/4 bg-gradient-to-r from-royal-600 to-ember-500 md:block" aria-hidden="true" />
                    <span className="absolute bottom-16 left-5 top-5 w-0.5 bg-gradient-to-b from-royal-600 to-ember-500 md:hidden" aria-hidden="true" />
                    {STEPS.map(([Icon, title, body], i) => (
                        <li key={title} className="relative pl-14 md:pl-0">
                            <Reveal delay={i * 90}>
                                <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-royal-900 text-ember-300 ring-4 ring-background md:static"><Icon className="h-5 w-5" /></span>
                                <h3 className="font-display text-lg font-bold tracking-tight md:mt-4"><span className="sr-only">Step {i + 1}: </span>{title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                            </Reveal>
                        </li>
                    ))}
                </ol>
            </Section>

            <div id="coverage" className="scroll-mt-16 bg-card"><Section><Reveal><SectionTitle eyebrow="Coverage" title="Are we in your area?" subtitle={content.coverage_intro} /><CoverageChecker areas={content.coverage_areas} /></Reveal></Section></div>

            <div ref={inquireRef} className="keep-light relative isolate overflow-hidden bg-royal-950 text-white">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-royal-800 via-royal-700 to-royal-600" aria-hidden="true" />
                <Section id="inquire" className="grid items-center gap-10 lg:grid-cols-2">
                    <div>
                        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">Let's get you <span className="text-ember-300">connected</span></h2>
                        <p className="mt-4 max-w-md text-royal-100/85">Send your details and we will check coverage at your address.</p>
                        {contact.phone && <p className="mt-6 text-sm text-royal-100/80">Prefer to talk? {[contact.phone, contact.phone2].filter(Boolean).map((phone, i) => <span key={phone}>{i > 0 && ' or '}<a href={`tel:${phone}`} className="font-semibold text-white underline-offset-4 hover:underline">{phone}</a></span>)}</p>}
                    </div>
                    <div className="text-foreground"><InquiryForm plans={plans} sent={inquirySent} /></div>
                </Section>
            </div>

            <div className={cn('keep-light fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-royal-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]', contact.messenger && 'pr-[4.5rem]', ' backdrop-blur transition-transform duration-300 lg:hidden', showBar ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!showBar}>
                <Button asChild tabIndex={showBar ? 0 : -1} className={cn('h-12 w-full', amberButton)}><a href="#inquire">Get Connected</a></Button>
            </div>
        </>
    );
}
