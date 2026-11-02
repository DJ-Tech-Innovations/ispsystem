const TZ = 'Asia/Manila';

export const money = (value: number | string | null | undefined) =>
    '₱' + Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const compactMoney = (value: number) =>
    '₱' + new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/** Date-only values come as YYYY-MM-DD and are shown as written, with no timezone shift. */
export const date = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', ...(value.length === 10 ? {} : { timeZone: TZ }) });
};

export const dateTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '—';

/** Value for <input type="datetime-local"> in the ISP's timezone. */
export const toLocalInput = (value: string | null | undefined) => {
    if (!value) return '';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(value));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour').replace('24', '00')}:${get('minute')}`;
};

export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
export const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
