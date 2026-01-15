
import React, { useEffect, useRef, useState } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { useBookStore } from '@/stores/useStore';

interface EpubReaderProps {
    url: string | ArrayBuffer;
    initialLocation?: string;
    onLocationChange?: (location: string, percentage: number) => void;
    isSplit?: boolean; // If true, rendering in split screen (smaller UI)
}

export default function EpubReader({ url, initialLocation, onLocationChange, isSplit = false }: EpubReaderProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const { settings } = useBookStore();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!viewerRef.current || !url) return;

        // Initialize Book
        const book = ePub(url);
        bookRef.current = book;

        // Initialize Rendition
        const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: settings.readingMode === 'single' ? 'scrolled-doc' : 'paginated',
            manager: settings.readingMode === 'single' ? 'continuous' : 'default',
            // Note: Epub.js default manager handles paginated. Animation differences are usually CSS or manager dependent.
            // For 'double-static', we might want to ensure no transition time, but default is fine for MVP.
        });
        renditionRef.current = rendition;

        // Display initial page
        rendition.display(initialLocation || undefined).then(() => {
            setIsReady(true);
            applySettings();
        });

        // Event listeners
        rendition.on('relocated', (location: any) => {
            if (onLocationChange) {
                // Calculate percentage (approximate)
                // Note: epubjs location generation can be resource intensive
                const percentage = location.start.percentage;
                onLocationChange(location.start.cfi, percentage);
            }
        });

        return () => {
            if (bookRef.current) {
                bookRef.current.destroy();
            }
        };
    }, [url]);

    // React to settings changes
    useEffect(() => {
        if (!isReady || !renditionRef.current) return;
        applySettings();
    }, [settings, isReady]);

    const applySettings = () => {
        const rendition = renditionRef.current;
        if (!rendition) return;

        // Font Size
        rendition.themes.fontSize(`${settings.fontSize}%`);

        // Theme
        if (settings.theme === 'dark') {
            rendition.themes.register('dark', { body: { color: 'white', background: '#0f172a' } });
            rendition.themes.select('dark');
        } else if (settings.theme === 'sepia') {
            rendition.themes.register('sepia', { body: { color: '#5f4b32', background: '#f6f1d1' } });
            rendition.themes.select('sepia');
        } else {
            rendition.themes.register('light', { body: { color: 'black', background: 'white' } });
            rendition.themes.select('light');
        }

        // Layout Mode updates usually require re-rendering or flow update, handled simpler here implies straightforward CSS updates
        // Complex flow changes (paginated vs scrolled) often need restart in epubjs, simplistic approach for now.
    };

    const prevPage = () => {
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
    };

    const nextPage = () => {
        if (renditionRef.current) {
            renditionRef.current.next();
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden bg-background">
                <div ref={viewerRef} className="w-full h-full" />
            </div>

            {/* Navigation Layers (Click zones) */}
            <div className="absolute inset-y-0 left-0 w-16 z-10 cursor-pointer hover:bg-black/5 transition-colors" onClick={prevPage} title="Önceki Sayfa" />
            <div className="absolute inset-y-0 right-0 w-16 z-10 cursor-pointer hover:bg-black/5 transition-colors" onClick={nextPage} title="Sonraki Sayfa" />
        </div>
    );
}
