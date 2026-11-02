import { Head } from '@inertiajs/react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { InquiryForm, PageHero, Section, type Plan } from '@/components/app/site';
import type { ContactDetails } from '@/layouts/PublicLayout';

export default function Contact({ plans, selectedPlan, inquirySent, contact }: { plans: Plan[]; selectedPlan: string | null; inquirySent: boolean; contact: ContactDetails }) {
    const rows = [[Phone, contact.phone], [Phone, contact.phone2], [Mail, contact.email], [MapPin, contact.address], [Clock, contact.hours]] as const;
    return (
        <>
            <Head title="Contact Us" />
            <PageHero title="Contact us" subtitle="Ask about coverage, plans or anything else." />
            <Section className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
                <ul className="space-y-4">
                    {rows.filter(([, v]) => v).map(([Icon, value]) => <li key={value} className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600"><Icon className="h-5 w-5" /></span><span className="min-w-0 break-words pt-2 text-sm font-medium">{value}</span></li>)}
                </ul>
                <InquiryForm plans={plans} selectedPlan={selectedPlan} sent={inquirySent} />
            </Section>
        </>
    );
}
