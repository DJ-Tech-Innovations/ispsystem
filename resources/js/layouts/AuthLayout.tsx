import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { useShared } from '@/hooks/use-shared';
import { initials } from '@/lib/format';

function BrandMark({ onDark = false }: { onDark?: boolean }) {
    const { business } = useShared();
    if (business.logo) return <span className={`flex h-14 items-center overflow-hidden rounded-xl ${onDark ? 'bg-white px-3 py-1.5 shadow-sm' : ''}`}><img src={business.logo} alt={business.name} className="h-full w-auto object-contain" /></span>;
    return <span className={`keep-light flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white ${onDark ? 'bg-white/15 ring-1 ring-white/25' : 'bg-royal-950'}`}>{initials(business.name)}</span>;
}

export default function AuthLayout({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
    const { business } = useShared();

    return (
        <div className="flex min-h-screen bg-background">
            <Head title={title} />
            <div className="keep-light relative isolate hidden w-1/2 flex-col justify-between overflow-hidden bg-royal-950 p-10 text-white lg:flex xl:w-[55%] xl:p-14">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-royal-900 via-royal-700 to-royal-900" aria-hidden="true">
                    <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px]" />
                    <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-royal-500/30 blur-3xl" />
                    <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-royal-500/25 blur-3xl" />
                </div>
                <div className="flex items-center gap-3">
                    <BrandMark onDark />
                    {!business.logo && <span className="text-lg font-semibold tracking-tight drop-shadow-sm">{business.name}</span>}
                </div>
                <div className="space-y-10">
                    <div className="max-w-lg space-y-4">
                        <span className="block h-1 w-12 rounded-full bg-white/70" aria-hidden="true" />
                        <p className="text-3xl font-semibold leading-tight tracking-tight drop-shadow-sm xl:text-4xl">{business.tagline || business.name}</p>
                        <p className="text-base leading-relaxed text-white/80">Your internet service, billing and support, all in one place.</p>
                    </div>
                    <p className="text-xs text-white/60">© {new Date().getFullYear()} {business.name}. All rights reserved.</p>
                </div>
            </div>
            <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
                <div className="absolute right-4 top-4"><ThemeToggle /></div>
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <BrandMark />
                        {!business.logo && <span className="text-lg font-semibold text-foreground">{business.name}</span>}
                    </div>
                    <div className="mb-8 space-y-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {children}
                    {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
                </div>
            </main>
        </div>
    );
}
