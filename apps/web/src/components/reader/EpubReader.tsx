
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { useBookStore } from '@/stores/useStore';

export interface EpubReaderRef {
    prev: () => void;
    next: () => void;
    goTo: (loc: string) => void;
}

interface EpubReaderProps {
    url: string | ArrayBuffer;
    initialLocation?: string;
    onLocationChange?: (location: string, percentage: number) => void;
    isSplit?: boolean;
    options?: any; // Pass specific flow/manager options
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(({ url, initialLocation, onLocationChange, isSplit = false, options }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const { settings } = useBookStore();
    const [isReady, setIsReady] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        prev: () => renditionRef.current?.prev(),
        next: () => renditionRef.current?.next(),
        goTo: (loc: string) => renditionRef.current?.display(loc)
    }));

    useEffect(() => {
        if (!viewerRef.current || !url) return;

        setError(null); // Reset error

        // Cleanup previous book if exists
        if (bookRef.current) {
            bookRef.current.destroy();
        }

        try {
            // Initialize Book
            const book = ePub(url, {
                openAs: 'epub', // Force epub mode for safety
            });
            bookRef.current = book;

            // Determine default options based on settings if not provided
            const defaultOptions = options || {
                width: '100%',
                height: '100%',
                flow: settings.readingMode === 'single' ? 'scrolled-doc' : 'paginated',
                manager: settings.readingMode === 'single' ? 'continuous' : 'default',
            };

            // Initialize Rendition
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                ...defaultOptions
            });
            renditionRef.current = rendition;

            // Display initial page and handle errors
            book.ready.then(() => {
                return rendition.display(initialLocation || undefined);
            }).then(() => {
                setIsReady(true);
                applySettings(rendition);
            }).catch((err) => {
                console.error("EPUB Rendering Error:", err);
                setError("Kitap içeriği okunamadı. Dosya bozuk veya geçersiz bir EPUB formatında olabilir.");
            });

            // Event listeners
            rendition.on('relocated', (location: any) => {
                if (onLocationChange) {
                    const percentage = location.start.percentage;
                    onLocationChange(location.start.cfi, percentage);
                }
            });
        } catch (err) {
            console.error("EPUB Init Error:", err);
            setError("Kitap başlatılamadı.");
        }

        return () => {
            if (bookRef.current) {
                bookRef.current.destroy();
            }
        };
    }, [url, options]); // Re-init on url or options change

    // React to settings changes that don't need re-init
    useEffect(() => {
        if (!isReady || !renditionRef.current) return;
        applySettings(renditionRef.current);
    }, [settings, isReady]);

    const applySettings = (rendition: Rendition) => {
        // Font Size
        rendition.themes.fontSize(`${settings.fontSize}%`);

        // Theme
        if (settings.theme === 'dark') {
            rendition.themes.register('dark', { body: { color: '#c9d1d9', background: '#0f172a' } }); // Better dark mode contrast
            rendition.themes.select('dark');
        } else if (settings.theme === 'sepia') {
            rendition.themes.register('sepia', { body: { color: '#5f4b32', background: '#f6f1d1' } });
            rendition.themes.select('sepia');
        } else {
            rendition.themes.register('light', { body: { color: 'black', background: 'white' } });
            rendition.themes.select('light');
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-full flex-col gap-2 text-red-500 p-4 text-center">
                <p className="font-bold">Hata</p>
                <p>{error}</p>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden bg-background">
                <div ref={viewerRef} className="w-full h-full" />
            </div>
        </div>
    );
});

export default EpubReader;
