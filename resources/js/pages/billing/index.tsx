import { Head } from '@inertiajs/react';
import { CalendarClock, Play } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/app/Can';
import { ConfirmAction, EmptyState, Page, Pagination, StatusBadge, Table, Td, Tr } from '@/components/app/kit';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { date, dateTime, money, titleCase } from '@/lib/format';
import type { Paginated, Person } from '@/types';

interface Run { id: string; run_date: string; trigger: string; status: string; eligible_count: number; created_count: number; skipped_count: number; failed_count: number; total_amount: string; failures: { subscription: string; error: string }[] | null; starter: Person | null; finished_at: string | null }

export default function BillingIndex({ runs, eligibleToday }: { runs: Paginated<Run>; eligibleToday: number }) {
    const [confirming, setConfirming] = useState(false);
    return (
        <Page>
            <Head title="Billing Runs" />
            <PageHeader title="Billing Runs" description={`Runs automatically every day at 1:00 AM. ${eligibleToday} subscription${eligibleToday === 1 ? ' is' : 's are'} due for billing now.`} actions={<Can permission="billing.run"><Button onClick={() => setConfirming(true)} disabled={eligibleToday === 0}><Play className="mr-2 h-4 w-4" />Run Now</Button></Can>} />
            {runs.total === 0 ? (
                <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No billing runs yet" description="The first run appears here after the daily schedule fires." />
            ) : (
                <>
                    <Table headers={['Date', 'Trigger', ['Eligible', 'right'], ['Created', 'right'], ['Skipped', 'right'], ['Failed', 'right'], ['Amount', 'right'], 'Status', 'Finished']}>
                        {runs.data.map((r) => (
                            <Tr key={r.id}>
                                <Td><span className="whitespace-nowrap font-medium">{date(r.run_date)}</span></Td>
                                <Td muted>{r.starter?.name ?? titleCase(r.trigger)}</Td>
                                <Td right muted>{r.eligible_count}</Td><Td right>{r.created_count}</Td><Td right muted>{r.skipped_count}</Td>
                                <Td right><span title={r.failures?.map((f) => `${f.subscription}: ${f.error}`).join('\n')} className={r.failed_count ? 'font-semibold text-red-600' : 'text-muted-foreground'}>{r.failed_count}</span></Td>
                                <Td right>{money(r.total_amount)}</Td>
                                <Td><StatusBadge value={r.status} /></Td>
                                <Td muted><span className="whitespace-nowrap">{dateTime(r.finished_at)}</span></Td>
                            </Tr>
                        ))}
                    </Table>
                    <Pagination meta={runs} label="runs" />
                </>
            )}
            <ConfirmAction open={confirming} onOpenChange={setConfirming} title="Run billing now?" description={`This bills ${eligibleToday} due subscription${eligibleToday === 1 ? '' : 's'} and emails the invoices. Running it twice can't double-bill anyone.`} url="/admin/billing" confirmLabel="Run Billing" />
        </Page>
    );
}
