import { Head } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { PageHero, Section } from '@/components/app/site';

export default function Faq({ content }: { content: { faqs: { question: string; answer: string }[] } }) {
    return (
        <>
            <Head title="FAQ" />
            <PageHero title="Frequently asked questions" />
            <Section>
                <div className="max-w-3xl divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
                    {content.faqs.map((f) => (
                        <details key={f.question} className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">{f.question}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
                            <p className="whitespace-pre-line px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                        </details>
                    ))}
                </div>
            </Section>
        </>
    );
}
