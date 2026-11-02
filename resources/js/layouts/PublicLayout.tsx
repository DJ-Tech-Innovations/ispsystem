import { Link, usePage } from '@inertiajs/react';
import { Clock, Globe, Mail, MessageCircle, MapPin, Menu, Phone, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useFlashToasts, useShared } from '@/hooks/use-shared';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV = [['Plans', '/plans'], ['Coverage', '/coverage'], ['About', '/about'], ['FAQ', '/faq'], ['Support', '/support'], ['Contact', '/contact']];

export interface ContactDetails { email: string; phone: string; phone2: string; address: string; hours: string; facebook: string; messenger: string | null }

export function Brand({ light = false }: { light?: boolean }) {
    const { business } = useShared();
    return (
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {business.logo ? <span className={cn('flex h-11 items-center rounded-lg', light && 'bg-white px-2 py-1')}><img src={business.logo} alt={business.name} className="h-full w-auto object-contain" /></span> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-600 text-sm font-bold text-white">{initials(business.name)}</span>}
            {!business.logo && <span className={cn('truncate text-base font-semibold tracking-tight', light ? 'text-white' : 'text-foreground')}>{business.name}</span>}
        </Link>
    );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage<{ contact?: ContactDetails }>();
    const { business } = useShared();
    const [open, setOpen] = useState(false);
    const contact = props.contact;
    const path = url.split('?')[0];
    useFlashToasts();
    useEffect(() => { setOpen(false); }, [url]);

    return (
        <div className="flex min-h-screen flex-col bg-background font-display [word-spacing:0.08em]">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
            <header className="keep-light sticky top-0 z-40 border-b border-border bg-white/95 text-royal-900 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Brand />
                    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
                        {NAV.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', path === href ? 'text-ember-600' : 'text-royal-900/70 hover:text-royal-900')}>{label}</Link>)}
                    </nav>
                    <div className="hidden items-center gap-2 lg:flex">
                        <Button asChild variant="ghost" className="text-royal-900 hover:bg-royal-50 hover:text-royal-900"><Link href="/portal/login">Customer Login</Link></Button>
                        <Button asChild className="bg-ember-500 font-semibold text-royal-950 hover:bg-ember-400"><Link href="/contact">Get Connected</Link></Button>
                    </div>
                    <button type="button" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)} className="rounded-md p-2 text-royal-900 hover:bg-royal-50 lg:hidden">{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
                </div>
                {open && (
                    <nav aria-label="Mobile" className="space-y-1 border-t border-border px-4 py-3 lg:hidden">
                        {NAV.map(([label, href]) => <Link key={href} href={href} className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-royal-50">{label}</Link>)}
                        <Link href="/portal/login" className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-royal-50">Customer Login</Link>
                        <Button asChild className="mt-2 w-full bg-ember-500 font-semibold text-royal-950 hover:bg-ember-400"><Link href="/contact">Get Connected</Link></Button>
                    </nav>
                )}
            </header>
            <main id="main" className="flex-1">{children}</main>
            {contact?.messenger && (
                <a href={contact.messenger} target="_blank" rel="noreferrer" aria-label="Chat with us on Messenger" className="group fixed bottom-3 right-3 z-40 flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-royal-500 to-violet-600 px-3 text-white shadow-lg shadow-royal-950/30 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 focus-visible:ring-offset-2 lg:bottom-6 lg:right-6 lg:h-14 lg:px-4">
                    <MessageCircle className="h-6 w-6" /><span className="hidden text-sm font-semibold lg:inline">Chat with us</span>
                </a>
            )}
            <footer className="keep-light border-t-4 border-ember-500 bg-royal-950 text-royal-100">
                <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
                    <div className="space-y-3">
                        <Brand light />
                        <p className="max-w-xs text-sm text-royal-200/80">{business.tagline}</p>
                    </div>
                    <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
                        {[...NAV, ['Customer Login', '/portal/login'], ['Privacy Notice', '/privacy']].map(([label, href]) => <Link key={href} href={href} className="text-royal-200/80 hover:text-white">{label}</Link>)}
                    </nav>
                    {contact && (
                        <ul className="space-y-2 text-sm text-royal-200/80">
                            {[contact.phone, contact.phone2].filter(Boolean).map((phone) => <li key={phone} className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><a href={`tel:${phone}`} className="hover:text-white">{phone}</a></li>)}
                            {contact.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><a href={`mailto:${contact.email}`} className="break-all hover:text-white">{contact.email}</a></li>}
                            {contact.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{contact.address}</li>}
                            {contact.hours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{contact.hours}</li>}
                            {contact.facebook && <li className="flex gap-2"><Globe className="mt-0.5 h-4 w-4 shrink-0" /><a href={contact.facebook} rel="noreferrer" target="_blank" className="hover:text-white">Facebook</a></li>}
                        </ul>
                    )}
                </div>
                <div className="border-t border-white/10 py-4 text-center text-xs text-royal-200/60">© {new Date().getFullYear()} {business.name}. All rights reserved.</div>
            </footer>
        </div>
    );
}
