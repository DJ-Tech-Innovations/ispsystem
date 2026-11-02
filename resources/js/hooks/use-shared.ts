import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { SharedProps } from '@/types';

export const useShared = () => usePage<SharedProps>().props;

export function useCan() {
    const { auth } = useShared();
    return (...permissions: string[]) => !!auth && (auth.isOwner || permissions.some((p) => auth.permissions.includes(p)));
}

export function useFlashToasts() {
    const { flash } = useShared();
    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);
}
