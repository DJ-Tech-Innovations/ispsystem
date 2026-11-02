import { Head } from '@inertiajs/react';
import { PageHero, Section } from '@/components/app/site';

export default function Privacy({ content }: { content: { privacy_body: string } }) {
    return (<><Head title="Privacy Notice" /><PageHero title="Privacy notice" /><Section><p className="max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground">{content.privacy_body}</p></Section></>);
}
