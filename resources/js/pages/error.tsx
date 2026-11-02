import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Home, LifeBuoy, MapPin, Phone, Wifi, type LucideIcon } from 'lucide-react';
import { Swoosh } from '@/components/app/site';
import { Button } from '@/components/ui/button';
import { useShared } from '@/hooks/use-shared';
import AppLayout from '@/layouts/AppLayout';
import PortalLayout from '@/layouts/PortalLayout';
import PublicLayout, { type ContactDetails } from '@/layouts/PublicLayout';

const COPY: Record<number, [string, string]> = {
    403: ['Access restricted', "You don't have permission to open this page. Ask an administrator if you need access."],
    404: ['We lost the signal on this page', "The page may have moved, or the link may be mistyped. Let's get you reconnected."],
    500: ['Something went wrong', "That's on us. Please try again in a moment."],
    503: ['Down for maintenance', "We'll be right back."],
};

const LINKS: [string, string, string, LucideIcon][] = [
    ['Internet plans', 'Compare speeds and prices', '/plans', Wifi],
    ['Coverage', 'See if we serve your area', '/coverage', MapPin],
    ['Support', 'Report a problem', '/support', LifeBuoy],
];

/** The zero of the 404 is the globe from the logo, its orbit broken where the signal dropped. */
function Globe404() {
    return (
        <p aria-label="404" className="flex items-center justify-center gap-1 font-display text-[7rem] font-extrabold leading-none tracking-tight sm:gap-3 sm:text-[11rem]">
            <span aria-hidden="true">4</span>
            <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" className="h-[6.5rem] w-[6.5rem] sm:h-[10rem] sm:w-[10rem]">
                <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
                    <circle cx="100" cy="100" r="54" />
                    <ellipse cx="100" cy="100" rx="22" ry="54" />
                    <path d="M46 100H154M54 72H146M54 128H146" />
                </g>
                <circle cx="100" cy="100" r="86" stroke="#E76131" strokeWidth="8" strokeDasharray="230 130" strokeLinecap="round" pathLength="360" transform="rotate(-60 100 100)" />
                <circle cx="151" cy="28" r="9" fill="currentColor" stroke="#E76131" strokeWidth="5" />
                <circle cx="182" cy="74" r="9" fill="currentColor" stroke="#E76131" strokeWidth="5" />
            </svg>
            <span aria-hidden="true">4</span>
        </p>
    );
}

function NotFoundWebsite({ contact }: { contact?: ContactDetails }) {
    const phones = [contact?.phone, contact?.phone2].filter(Boolean) as string[];

    return (
        <>
            <section className="keep-light relative isolate overflow-hidden bg-royal-900 text-white">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-royal-900 via-royal-700 to-royal-900" aria-hidden="true">
                    <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px]" />
                </div>
                <div className="mx-auto flex min-h-[62vh] max-w-3xl flex-col items-center justify-center px-4 pb-28 pt-12 text-center sm:px-6 sm:pb-36">
                    <Globe404 />
                    <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-5xl">{COPY[404][0]}</h1>
                    <p className="mt-4 max-w-xl text-lg text-royal-100/85">{COPY[404][1]}</p>
                    <Button asChild size="lg" className="mt-8 h-12 bg-ember-500 px-6 font-semibold text-royal-950 hover:bg-ember-400"><Link href="/"><Home className="mr-2 h-4 w-4" />Back to Home</Link></Button>
                </div>
                <Swoosh />
            </section>
            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
                <h2 className="text-center text-sm font-bold uppercase tracking-wider text-ember-600">Where would you like to go?</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                    {LINKS.map(([title, body, href, Icon]) => (
                        <li key={href}><Link href={href} className="group flex h-full items-center gap-3 rounded-2xl bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600"><Icon className="h-5 w-5" /></span>
                            <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{body}</span></span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </Link></li>
                    ))}
                </ul>
                {phones.length > 0 && (
                    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><Phone className="h-4 w-4" />Need a hand? Call {phones.map((phone, i) => <span key={phone}>{i > 0 && 'or '}<a href={`tel:${phone}`} className="font-semibold text-foreground hover:text-primary">{phone}</a></span>)}</p>
                )}
            </section>
        </>
    );
}

export default function ErrorPage({ status, contact }: { status: number; contact?: ContactDetails }) {
    const { url } = usePage();
    const { auth } = useShared();
    const [title, description] = COPY[status] ?? COPY[500];
    const area = url.startsWith('/admin') && auth ? 'admin' : url.startsWith('/portal') && auth ? 'portal' : 'public';
    const home = { admin: '/admin', portal: '/portal', public: '/' }[area];
    const Layout = { admin: AppLayout, portal: PortalLayout, public: PublicLayout }[area];

    return (
        <Layout>
            <Head title={status === 404 ? 'Page not found' : title} />
            {status === 404 && area === 'public' ? <NotFoundWebsite contact={contact} /> : (
                <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
                    {status === 404 ? <div className="text-royal-900 dark:text-foreground"><Globe404 /></div> : <p className="text-sm font-semibold text-primary">{status}</p>}
                    <h1 className={status === 404 ? 'mt-4 text-2xl font-bold tracking-tight' : 'mt-2 text-2xl font-bold tracking-tight'}>{title}</h1>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
                    <Button asChild className="mt-6"><Link href={home}>{area === 'public' ? 'Back to home' : 'Back to dashboard'}</Link></Button>
                </div>
            )}
        </Layout>
    );
}
