import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowUpCircle, Clock, Info, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ConfirmAction, StatusBadge } from '@/components/app/kit';
import { mbpsOf, peso } from '@/components/app/site';
import { Button } from '@/components/ui/button';
import { useShared } from '@/hooks/use-shared';
import { date } from '@/lib/format';

interface Plan { id: string; name: string; speed_description: string; description: string | null; monthly_price: string }
interface Change { id: string; reference: string; status: string; requested_amount: string; decision_reason: string | null; plan: string }
interface Props { subscription: { id: string; reference: string; status: string; monthly_amount: string; next_billing_date: string | null; service_address: string; plan: Plan }; upgrades: Plan[]; pending: Change | null; latest: Change | null }

const speed = (plan: Plan) => mbpsOf({ ...plan, code: '', installation_fee: '0' });

export default function PortalUpgrade({ subscription: s, upgrades, pending, latest }: Props) {
    const { errors } = useShared();
    const [choice, setChoice] = useState<Plan | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const extra = (plan: Plan) => Number(plan.monthly_price) - Number(s.monthly_amount);
    const nextBill = s.next_billing_date ? date(s.next_billing_date) : 'your next bill';
    const canAsk = !pending && s.status === 'active';

    return (
        <>
            <Head title="Upgrade Plan" />
            <Link href="/portal" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to my account</Link>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upgrade your plan</h1>
            <p className="mt-1 text-sm text-muted-foreground">{s.service_address}</p>

            <section className="keep-light mt-6 rounded-2xl bg-gradient-to-br from-royal-900 via-royal-700 to-royal-900 p-6 text-white shadow-card">
                <p className="text-sm text-royal-200">Your current plan</p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                    <div><p className="text-2xl font-bold">{s.plan.name}</p><p className="text-sm text-royal-100/80">{s.plan.speed_description}</p></div>
                    <p className="text-2xl font-bold tabular-nums">{peso(s.monthly_amount)}<span className="text-sm font-normal text-royal-100/70"> /month</span></p>
                </div>
            </section>

            {errors.plan && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.plan}</p>}

            {pending && (
                <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-royal-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3 text-royal-800"><Clock className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Request for {pending.plan} is being reviewed</p><p className="text-sm">Reference {pending.reference}. We'll email you once it's decided.</p></div></div>
                    <Button variant="outline" className="bg-card" onClick={() => setCancelling(true)}>Cancel Request</Button>
                </div>
            )}
            {!pending && latest?.status === 'rejected' && (
                <div className="mt-6 flex gap-3 rounded-2xl bg-ember-50 p-5 text-ember-800"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Your request for {latest.plan} wasn't approved</p><p className="text-sm">{latest.decision_reason}</p></div></div>
            )}
            {!pending && latest?.status === 'approved' && <div className="mt-6 flex items-center gap-2"><StatusBadge value="confirmed" label="Upgrade approved" /><span className="text-sm text-muted-foreground">Your new price starts on {nextBill}.</span></div>}

            <h2 className="mt-8 text-lg font-semibold">Faster plans</h2>
            {upgrades.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-card">You're already on our top plan. Thank you for staying with us!</p>
            ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upgrades.map((p) => {
                        const now = speed(s.plan); const next = speed(p);
                        return (
                            <article key={p.id} className="flex flex-col rounded-2xl bg-card p-5 shadow-card">
                                <h3 className="font-semibold">{p.name}</h3>
                                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{next ?? p.speed_description}{next && <span className="ml-1 text-sm font-semibold text-muted-foreground">Mbps</span>}</p>
                                {now && next && <p className="text-sm font-medium text-emerald-700">{Number.isInteger(next / now) ? `${next / now}×` : `${(next / now).toFixed(1)}×`} your current speed</p>}
                                <p className="mt-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
                                <p className="mt-4 text-xl font-bold tabular-nums">{peso(p.monthly_price)}<span className="text-sm font-normal text-muted-foreground"> /month</span></p>
                                <p className="text-xs text-muted-foreground">{extra(p) > 0 ? `${peso(extra(p))} more than you pay now` : 'No increase from what you pay now'}</p>
                                <Button disabled={!canAsk} onClick={() => setChoice(p)} className="mt-4 w-full bg-ember-500 font-semibold text-royal-950 hover:bg-ember-400"><ArrowUpCircle className="mr-2 h-4 w-4" />Request Upgrade</Button>
                            </article>
                        );
                    })}
                </div>
            )}
            <p className="mt-5 flex gap-2 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />Upgrades are reviewed by our team. Once approved, the new price applies from your bill on {nextBill}. Invoices already issued don't change.</p>

            <ConfirmAction open={!!choice} onOpenChange={() => setChoice(null)} title={`Upgrade to ${choice?.name}?`} description={choice ? `Your plan becomes ${peso(choice.monthly_price)} a month, starting with your bill on ${nextBill} once approved.` : ''} url={`/portal/services/${s.id}/upgrade`} confirmLabel="Send Request" data={{ plan: choice?.id }} />
            <ConfirmAction open={cancelling} onOpenChange={setCancelling} title="Cancel this request?" description="Your current plan stays the same." url={`/portal/upgrades/${pending?.id}`} method="delete" confirmLabel="Cancel Request" />
        </>
    );
}
