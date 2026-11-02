import { Link } from '@inertiajs/react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Swoosh } from '@/components/app/site';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Slide { title: string; body: string | null; cta_label: string | null; cta_url: string | null; image: string | null }

const DELAY = 7000;

/** A marketing slide. Without a photo it sits on the fiber backdrop, with rings so it doesn't look like an empty slot. */
export function PromoSlide({ slide, index }: { slide: Slide; index: number }) {
    const url = slide.cta_url ?? '';
    const words = slide.title.trim().split(' ');
    const accent = words.splice(words.length > 3 ? -2 : -1).join(' ');

    return (
        <div className="relative">
            {!slide.image && (
                <svg className="pointer-events-none absolute -right-28 top-1/2 hidden h-[30rem] w-[30rem] -translate-y-1/2 xl:block" viewBox="0 0 400 400" fill="none" aria-hidden="true">
                    {/* The O of the logo: a ring, a dashed orange orbit, and circuit nodes like the ends of the G. */}
                    <circle cx="200" cy="200" r="72" stroke="#9AA9F5" strokeOpacity=".6" strokeWidth="2" />
                    <ellipse cx="200" cy="200" rx="30" ry="72" stroke="#9AA9F5" strokeOpacity=".6" strokeWidth="2" />
                    <path d="M128 200 H272 M136 166 H264 M136 234 H264" stroke="#9AA9F5" strokeOpacity=".6" strokeWidth="2" />
                    <circle cx="200" cy="200" r="118" stroke="#F27F4A" strokeWidth="3" strokeDasharray="14 10" style={{ transform: `rotate(${index * 40}deg)`, transformOrigin: '200px 200px' }} />
                    <circle cx="200" cy="200" r="168" stroke="#9AA9F5" strokeOpacity=".3" strokeWidth="1.5" />
                    {[[81, 81], [319, 81], [319, 319], [81, 319]].map(([x, y]) => <circle key={x + y * 7} cx={x} cy={y} r="8" fill="#10166F" stroke="#F27F4A" strokeWidth="3" />)}
                </svg>
            )}
            <div className="relative max-w-2xl">
                <h2 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">{words.join(' ')} <span className="text-ember-300">{accent}</span></h2>
                {slide.body && <p className="mt-6 max-w-xl text-lg text-royal-100/90">{slide.body}</p>}
                {slide.cta_label && url && (
                    <Button asChild size="lg" className="mt-8 h-12 bg-ember-500 px-6 font-semibold text-royal-950 shadow-lg shadow-ember-500/20 hover:bg-ember-400">
                        {url.startsWith('/') ? <Link href={url}>{slide.cta_label}<ArrowRight className="ml-2 h-4 w-4" /></Link> : <a href={url} {...(url.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{slide.cta_label}<ArrowRight className="ml-2 h-4 w-4" /></a>}
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * Full-screen crossfading hero. It waits while a visitor hovers, tabs through or uses a slide, has a pause button,
 * and never moves by itself for people who ask for reduced motion.
 */
export function HeroCarousel({ slides, backdrop }: { slides: { key: string; image?: string | null; content: ReactNode }[]; backdrop?: ReactNode }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [held, setHeld] = useState(false);
    const [hidden, setHidden] = useState(false);
    const touchX = useRef<number | null>(null);
    const count = slides.length;
    const running = count > 1 && !paused && !held && !hidden;
    const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

    useEffect(() => { if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true); }, []);
    useEffect(() => {
        const update = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);
    useEffect(() => {
        if (!running) return;
        const timer = setTimeout(() => go(index + 1), DELAY);
        return () => clearTimeout(timer);
    }, [running, index, go]);

    const onTouchEnd = (x: number) => {
        if (touchX.current !== null && Math.abs(x - touchX.current) > 50) go(index + (x < touchX.current ? 1 : -1));
        touchX.current = null;
    };

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Highlights"
            className="keep-light relative isolate touch-pan-y overflow-hidden bg-royal-950 text-white"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocusCapture={() => setHeld(true)}
            onBlurCapture={() => setHeld(false)}
            onClick={(e) => { if ((e.target as HTMLElement).closest('[data-stops-carousel]')) setPaused(true); }}
            onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') go(index + (e.key === 'ArrowRight' ? 1 : -1)); }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
        >
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-royal-900 via-royal-700 to-royal-900" aria-hidden="true" />
            {backdrop}

            <div className="grid min-h-[calc(100svh-4rem)]">
                {slides.map((slide, i) => (
                    <div key={slide.key} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} inert={i !== index} className={cn('relative flex items-center transition-opacity duration-700 [grid-area:1/1]', i === index ? 'z-10 opacity-100' : 'pointer-events-none opacity-0')}>
                        {slide.image && (
                            <>
                                <img src={slide.image} alt="" loading={i === 1 ? 'eager' : 'lazy'} className={cn('absolute inset-0 h-full w-full object-cover transition-transform duration-[8000ms] ease-out', i === index ? 'scale-105' : 'scale-100')} />
                                {/* Keeps white text readable on any photo. */}
                                <div className="absolute inset-0 bg-gradient-to-r from-royal-950/90 via-royal-950/65 to-royal-950/20" aria-hidden="true" />
                            </>
                        )}
                        <div key={i === index ? 'on' : 'off'} className="slide-rise relative mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 sm:pb-40 sm:pt-16">{slide.content}</div>
                    </div>
                ))}
            </div>

            {count > 1 && (
                <div className="absolute inset-x-0 bottom-14 z-20 sm:bottom-20 lg:bottom-24">
                    <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pr-20 sm:px-6 sm:pr-20 lg:pr-40 2xl:pr-6">
                        <div className="flex flex-1 gap-2">
                            {slides.map((slide, i) => (
                                <button key={slide.key} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === index} onClick={() => go(i)} className="group relative h-6 flex-1 sm:max-w-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300">
                                    <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 group-hover:bg-white/40">
                                        {i === index && <span key={`${index}-${running}`} className={cn('block h-full bg-ember-500', running ? 'slide-progress' : 'w-full')} />}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button type="button" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(!paused)} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
                        <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="hidden rounded-full p-2 text-white/80 ring-1 ring-inset ring-white/25 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 sm:block"><ChevronLeft className="h-5 w-5" /></button>
                        <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="hidden rounded-full p-2 text-white/80 ring-1 ring-inset ring-white/25 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 sm:block"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                </div>
            )}
            <Swoosh />
        </section>
    );
}
