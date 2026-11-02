import { Head, Link } from '@inertiajs/react';
import { CoverageChecker, PageHero, Section } from '@/components/app/site';
import { Button } from '@/components/ui/button';

export default function Coverage({ content }: { content: { coverage_intro: string; coverage_areas: string[] } }) {
    return (
        <>
            <Head title="Coverage Area" />
            <PageHero title="Coverage area" subtitle={content.coverage_intro} />
            <Section>
                <CoverageChecker areas={content.coverage_areas} />
                <div className="mt-10 rounded-2xl bg-card p-6 shadow-card sm:flex sm:items-center sm:justify-between">
                    <div><h2 className="font-semibold">Don't see your area?</h2><p className="text-sm text-muted-foreground">Send us your address and we will check it.</p></div>
                    <Button asChild className="mt-4 sm:mt-0"><Link href="/contact">Ask About Your Area</Link></Button>
                </div>
            </Section>
        </>
    );
}
