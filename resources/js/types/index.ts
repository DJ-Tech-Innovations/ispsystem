export interface Option { value: string; label: string }
export interface Paginated<T> {
    data: T[]; current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null;
}
export interface SharedProps {
    auth: { user: { id: string; name: string; email: string; role: string }; isOwner: boolean; permissions: string[] } | null;
    business: { name: string; tagline: string | null; logo: string | null; mark: string | null };
    timezone: string;
    flash: { success: string | null; error: string | null };
    enums: Record<string, Option[]>;
    counts: { planChanges: number; leads: number; installations: number; overdue: number; tickets: number };
    errors: Record<string, string>;
    [key: string]: unknown;
}
export interface Person { id: string; name: string }
export interface CustomerRef { id: string; reference?: string; name: string; mobile?: string }
