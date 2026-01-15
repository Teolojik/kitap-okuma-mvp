
// src/components/ReloadPrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
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
            toast('Yeni versiyon mevcut!', {
                action: {
                    label: 'Yenile',
                    onClick: () => updateServiceWorker(true)
                },
                duration: Infinity
            });
        }
    }, [needRefresh]);

    return null;
}
