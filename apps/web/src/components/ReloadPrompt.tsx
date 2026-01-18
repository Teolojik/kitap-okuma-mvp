
// src/components/ReloadPrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useTranslation } from '@/lib/translations';
import { useBookStore } from '@/stores/useStore';

export default function ReloadPrompt() {
    const { settings } = useBookStore();
    const t = useTranslation(settings.language);
    const {
        needRefresh: [needRefresh, _setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error: any) {
            console.log('SW registration error', error)
        },
    })

    useEffect(() => {
        if (needRefresh) {
            toast(t('newVersionAvailable'), {
                action: {
                    label: t('refresh'),
                    onClick: () => updateServiceWorker(true)
                },
                duration: Infinity
            });
        }
    }, [needRefresh, t, updateServiceWorker]);

    return null;
}
