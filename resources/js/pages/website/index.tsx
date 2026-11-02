import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, Plus, Trash2, Upload } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Field, Page, SubmitButton } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Slide { title: string; body: string | null; cta_label: string | null; cta_url: string | null; image: string | null }
interface Content { slides: Slide[]; hero_title: string; hero_subtitle: string; about_title: string; about_body: string; benefits: { title: string; body: string }[]; coverage_intro: string; coverage_areas: string[]; faqs: { question: string; answer: string }[]; hours: string; facebook_url: string; messenger_username: string; messenger_bot_enabled: boolean; messenger_welcome: string; privacy_body: string }
const Panel = ({ children }: { children: ReactNode }) => <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">{children}</div>;

export default function WebsiteIndex({ content, storageUrl, messenger }: { content: Content; storageUrl: string; messenger: { webhook: string; configured: boolean } }) {
    const form = useForm<Content>({ ...content, hours: content.hours ?? '', facebook_url: content.facebook_url ?? '', messenger_username: content.messenger_username ?? '', messenger_welcome: content.messenger_welcome ?? '' });
    const errors = form.errors as Record<string, string>;
    const anyError = Object.values(errors)[0];
    const [uploading, setUploading] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState('');
    const setSlide = (i: number, changes: Partial<Slide>) => form.setData((d) => ({ ...d, slides: d.slides.map((s, x) => (x === i ? { ...s, ...changes } : s)) }));
    const upload = async (i: number, file: File) => {
        setUploading(i);
        setUploadError('');
        const body = new FormData();
        body.append('image', file);
        const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
        const res = await fetch('/admin/website/slide-image', { method: 'POST', body, headers: { Accept: 'application/json', 'X-XSRF-TOKEN': token } });
        if (res.ok) setSlide(i, { image: (await res.json()).path });
        else setUploadError('That picture could not be uploaded. Use a JPG, PNG or WebP up to 4 MB.');
        setUploading(null);
    };
    const submit = (e: FormEvent) => { e.preventDefault(); form.put('/admin/website', { preserveScroll: true }); };
    const setRow = (key: 'benefits' | 'faqs', i: number, field: string, value: string) => form.setData((d) => ({ ...d, [key]: (d[key] as Record<string, string>[]).map((row, x) => (x === i ? { ...row, [field]: value } : row)) }));
    const removeRow = (key: 'benefits' | 'faqs', i: number) => form.setData((d) => ({ ...d, [key]: (d[key] as unknown[]).filter((_, x) => x !== i) }));

    return (
        <Page>
            <Head title="Website" />
            <PageHeader title="Website" description="Plans come from Service Plans, contact details from Settings, and notices from Announcements." actions={<Button asChild variant="outline" className="bg-card"><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />View Website</a></Button>} />
            <form onSubmit={submit}>
                <Tabs defaultValue="slides" className="max-w-4xl">
                    <TabsList className="mb-2 h-auto flex-wrap justify-start bg-card shadow-card">
                        {[['slides', 'Carousel'], ['home', 'Home'], ['about', 'About'], ['coverage', 'Coverage'], ['faq', 'FAQ'], ['contact', 'Contact'], ['messenger', 'Messenger'], ['privacy', 'Privacy']].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
                    </TabsList>
                    <TabsContent value="slides">
                        <Panel>
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-muted-foreground">The speed picker is always the first slide. Wide photos work best, at least 1920 × 1080. Text sits on the left.</p>
                                <Button type="button" size="sm" variant="outline" disabled={form.data.slides.length >= 6} onClick={() => form.setData('slides', [...form.data.slides, { title: '', body: '', cta_label: '', cta_url: '', image: null }])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Slide</Button>
                            </div>
                            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                            {form.data.slides.map((s, i) => (
                                <div key={i} className="space-y-3 rounded-xl border border-border p-4">
                                    <div className="flex items-center justify-between"><p className="text-sm font-semibold">Slide {i + 2}</p><Button type="button" variant="ghost" size="icon" aria-label={`Remove slide ${i + 2}`} onClick={() => form.setData('slides', form.data.slides.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                                    <Field label="Headline" required error={errors[`slides.${i}.title`]}><Input value={s.title} onChange={(e) => setSlide(i, { title: e.target.value })} /></Field>
                                    <Field label="Text" error={errors[`slides.${i}.body`]}><Input value={s.body ?? ''} onChange={(e) => setSlide(i, { body: e.target.value })} /></Field>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Button text" error={errors[`slides.${i}.cta_label`]}><Input value={s.cta_label ?? ''} onChange={(e) => setSlide(i, { cta_label: e.target.value })} /></Field>
                                        <Field label="Button link" error={errors[`slides.${i}.cta_url`]} hint="/contact, #plans or https://..."><Input value={s.cta_url ?? ''} onChange={(e) => setSlide(i, { cta_url: e.target.value })} /></Field>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {s.image && <img src={storageUrl.replace(/\/$/, '') + '/' + s.image} alt="" className="h-16 w-28 rounded-lg object-cover" />}
                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                                            <Upload className="h-4 w-4" />{uploading === i ? 'Uploading...' : s.image ? 'Change photo' : 'Add photo'}
                                            <input type="file" className="sr-only" aria-label={`Photo for slide ${i + 2}`} accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(i, file); e.target.value = ''; }} />
                                        </label>
                                        {s.image && <Button type="button" variant="ghost" size="sm" onClick={() => setSlide(i, { image: null })}>Remove photo</Button>}
                                    </div>
                                </div>
                            ))}
                        </Panel>
                    </TabsContent>
                    <TabsContent value="home">
                        <Panel>
                            <Field label="Headline" required error={errors.hero_title}><Input value={form.data.hero_title} onChange={(e) => form.setData('hero_title', e.target.value)} /></Field>
                            <Field label="Introduction" required error={errors.hero_subtitle}><Textarea rows={3} value={form.data.hero_subtitle} onChange={(e) => form.setData('hero_subtitle', e.target.value)} /></Field>
                            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Benefits</p><Button type="button" size="sm" variant="outline" onClick={() => form.setData('benefits', [...form.data.benefits, { title: '', body: '' }])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add</Button></div>
                            {form.data.benefits.map((b, i) => (
                                <div key={i} className="flex gap-2"><div className="flex-1 space-y-2"><Input aria-label="Benefit title" placeholder="Title" value={b.title} onChange={(e) => setRow('benefits', i, 'title', e.target.value)} /><Textarea aria-label="Benefit description" rows={2} placeholder="Description" value={b.body} onChange={(e) => setRow('benefits', i, 'body', e.target.value)} /></div><Button type="button" variant="ghost" size="icon" aria-label="Remove benefit" onClick={() => removeRow('benefits', i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                            ))}
                        </Panel>
                    </TabsContent>
                    <TabsContent value="about">
                        <Panel>
                            <Field label="Headline" required error={errors.about_title}><Input value={form.data.about_title} onChange={(e) => form.setData('about_title', e.target.value)} /></Field>
                            <Field label="Your story" required error={errors.about_body}><Textarea rows={10} value={form.data.about_body} onChange={(e) => form.setData('about_body', e.target.value)} /></Field>
                        </Panel>
                    </TabsContent>
                    <TabsContent value="coverage">
                        <Panel>
                            <Field label="Introduction" required error={errors.coverage_intro}><Textarea rows={3} value={form.data.coverage_intro} onChange={(e) => form.setData('coverage_intro', e.target.value)} /></Field>
                            <Field label="Areas served" hint="One area per line."><Textarea rows={10} value={form.data.coverage_areas.join('\n')} onChange={(e) => form.setData('coverage_areas', e.target.value.split('\n'))} onBlur={() => form.setData('coverage_areas', form.data.coverage_areas.map((a) => a.trim()).filter(Boolean))} /></Field>
                        </Panel>
                    </TabsContent>
                    <TabsContent value="faq">
                        <Panel>
                            <Button type="button" size="sm" variant="outline" onClick={() => form.setData('faqs', [...form.data.faqs, { question: '', answer: '' }])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Question</Button>
                            {form.data.faqs.map((f, i) => (
                                <div key={i} className="flex gap-2"><div className="flex-1 space-y-2"><Input aria-label="Question" placeholder="Question" value={f.question} onChange={(e) => setRow('faqs', i, 'question', e.target.value)} /><Textarea aria-label="Answer" rows={3} placeholder="Answer" value={f.answer} onChange={(e) => setRow('faqs', i, 'answer', e.target.value)} /></div><Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => removeRow('faqs', i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                            ))}
                        </Panel>
                    </TabsContent>
                    <TabsContent value="contact">
                        <Panel>
                            <Field label="Business hours" error={errors.hours}><Input value={form.data.hours} onChange={(e) => form.setData('hours', e.target.value)} /></Field>
                            <Field label="Facebook page" error={errors.facebook_url} hint="Full link starting with https://"><Input value={form.data.facebook_url} onChange={(e) => form.setData('facebook_url', e.target.value)} /></Field>
                        </Panel>
                    </TabsContent>
                    <TabsContent value="messenger">
                        <Panel>
                            <p className={`rounded-lg px-3 py-2 text-sm font-medium ${messenger.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{messenger.configured ? 'Connection keys are set.' : 'Waiting for the Meta keys in the server environment. The website button still works without them.'}</p>
                            <Field label="Facebook Page username" error={errors.messenger_username} hint="The part after m.me/ in your Page link. Shows the chat button on the website."><Input value={form.data.messenger_username} onChange={(e) => form.setData('messenger_username', e.target.value)} placeholder="djfiberinternet" /></Field>
                            <label className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4 text-sm"><span><span className="block font-medium">Bot replies automatically</span><span className="block text-xs text-muted-foreground">Off means people still reach your Page inbox.</span></span><Switch checked={form.data.messenger_bot_enabled} onCheckedChange={(v) => form.setData('messenger_bot_enabled', v)} /></label>
                            <Field label="Welcome message" error={errors.messenger_welcome}><Textarea rows={3} value={form.data.messenger_welcome} onChange={(e) => form.setData('messenger_welcome', e.target.value)} placeholder="Hi! Welcome to our page. How can I help?" /></Field>
                            <Field label="Webhook address" hint="Paste this into your Meta app. It needs a public https domain, so it won't connect from this computer."><Input readOnly value={messenger.webhook} /></Field>
                        </Panel>
                    </TabsContent>
                    <TabsContent value="privacy">
                        <Panel><Field label="Privacy notice" required error={errors.privacy_body} hint="Sample wording. Have this reviewed against the Data Privacy Act before going live."><Textarea rows={14} value={form.data.privacy_body} onChange={(e) => form.setData('privacy_body', e.target.value)} /></Field></Panel>
                    </TabsContent>
                </Tabs>
                {anyError && <p className="mt-3 text-sm text-destructive">{anyError}</p>}
                <SubmitButton type="submit" className="mt-4" processing={form.processing}>Publish Changes</SubmitButton>
            </form>
        </Page>
    );
}
