import { useEffect } from 'react';

const PERSISTENT_PWA_HOSTS = new Set([
    'epigraphreader.com',
    'www.epigraphreader.com',
    'localhost',
    '127.0.0.1',
]);

export const shouldEnablePersistentPwa = (): boolean => {
    if (typeof window === 'undefined') return false;
    return PERSISTENT_PWA_HOSTS.has(window.location.hostname);
};

export default function PreviewServiceWorkerReset() {
    useEffect(() => {
        if (typeof window === 'undefined' || shouldEnablePersistentPwa()) return;
        if (!('serviceWorker' in navigator)) return;

        void (async () => {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => registration.unregister()));

                if ('caches' in window) {
                    const cacheKeys = await caches.keys();
                    await Promise.all(cacheKeys.map(cacheKey => caches.delete(cacheKey)));
                }
            } catch (error) {
                console.warn('Preview service worker cleanup failed:', error);
            }
        })();
    }, []);

    return null;
}
