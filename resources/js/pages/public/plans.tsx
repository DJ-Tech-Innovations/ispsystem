import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { PageHero, PlanCards, Section, type Plan } from '@/components/app/site';

export default function Plans({ plans }: { plans: Plan[] }) {
    return (<><Head title="Internet Plans" /><PageHero title="Internet plans" subtitle="One flat monthly price, installed and supported by our local team." /><Section><PlanCards plans={plans} /><p className="mt-6 text-center text-sm font-medium text-muted-foreground">All plans are unlimited. Installation is only ₱500 around Poblacion. <Link href="/contact" className="text-primary hover:underline">Special plans also available</Link>.</p><div className="mt-8 flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Already a subscriber?</h2><p className="text-sm text-muted-foreground">Sign in to upgrade your plan and keep your account.</p></div><Link href="/portal/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">Upgrade in the portal<ArrowRight className="h-4 w-4" /></Link></div></Section></>);
}
