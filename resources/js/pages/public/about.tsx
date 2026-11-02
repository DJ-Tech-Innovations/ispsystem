import { Head } from '@inertiajs/react';
import { Benefits, PageHero, Section, SectionTitle } from '@/components/app/site';

export default function About({ content }: { content: { about_title: string; about_body: string; benefits: { title: string; body: string }[] } }) {
    return (
        <>
            <Head title="About Us" />
            <PageHero title={content.about_title} />
            <Section><p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{content.about_body}</p></Section>
            <div className="bg-card"><Section><SectionTitle title="What you can expect" /><Benefits items={content.benefits} /></Section></div>
        </>
    );
}
