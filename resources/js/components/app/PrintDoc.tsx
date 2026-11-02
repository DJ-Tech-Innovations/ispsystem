import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useShared } from '@/hooks/use-shared';
import { initials } from '@/lib/format';

/** Paper layout for invoices and receipts: "Save as PDF" in the print dialog gives the downloadable copy. */
export function PrintDoc({ title, number, company, children }: { title: string; number: string; company: Record<string, string>; children: ReactNode }) {
    const { business } = useShared();
    return (
        <div className="print-doc keep-light min-h-screen bg-slate-100 py-8 text-slate-900 print:bg-white print:py-0">
            <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden"><Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save as PDF</Button></div>
            <div className="mx-auto max-w-3xl bg-white p-6 shadow-card sm:p-10 print:p-0 print:shadow-none">
                <header className="flex items-start justify-between gap-6 border-b-2 border-royal-950 pb-6">
                    <div className="flex items-start gap-3">
                        {business.logo ? <img src={business.logo} alt="" className="h-14 w-auto max-w-44 object-contain" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-royal-950 font-bold text-white">{initials(business.name)}</span>}
                        <div className="text-xs leading-relaxed text-slate-600">
                            <p className="text-base font-semibold text-slate-900">{business.name}</p>
                            {company.business_address && <p>{company.business_address}</p>}
                            <p>{[company.business_phone, company.business_email].filter(Boolean).join(' · ')}</p>
                            {company.business_tin && <p>TIN: {company.business_tin}</p>}
                        </div>
                    </div>
                    <div className="text-right"><p className="text-2xl font-bold uppercase tracking-tight text-royal-950">{title}</p><p className="text-sm text-slate-600">{number}</p></div>
                </header>
                {children}
            </div>
        </div>
    );
}
