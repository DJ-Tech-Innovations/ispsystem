import type { ReactNode } from 'react';
import { useCan } from '@/hooks/use-shared';

export function Can({ permission, children }: { permission: string | string[]; children: ReactNode }) {
    const can = useCan();
    return can(...[permission].flat()) ? <>{children}</> : null;
}
