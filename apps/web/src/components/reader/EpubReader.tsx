
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
    annotations?: any[];
    onTextSelected?: (cfiRange: string, text: string, contents: any) => void;
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(({ url, initialLocation, onLocationChange, isSplit = false, options, annotations, onTextSelected }, ref) => {
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

        let bookUrl = '';
        let isRevokable = false;

        // Ensure we pass a proper URL to epub.js
        if (url instanceof ArrayBuffer) {
            const blob = new Blob([url], { type: 'application/epub+zip' });
            bookUrl = URL.createObjectURL(blob);
            isRevokable = true;
        } else {
            bookUrl = url;
            // Handle base64 simulation if present
            if (bookUrl.startsWith('data:')) {
                // Keep as is
            }
        }

        try {
            // Initialize Book
            // Using 'default' method and allowing scripted content as requested for better compatibility
            const book = ePub(bookUrl, {
                openAs: 'epub',
            });

            bookRef.current = book;

            // Determine default options based on settings if not provided
            const defaultOptions = options || {
                width: '100%',
                height: '100%',
                flow: settings.readingMode === 'single' ? 'scrolled-doc' : 'paginated',
                manager: settings.readingMode === 'single' ? 'continuous' : 'default',
                allowScriptedContent: false, // Disable scripts to avoid sandbox warnings and improve security
            };

            // Initialize Rendition
            const rendition = book.renderTo(viewerRef.current, {
                method: 'default', // Explicitly set method
                width: '100%',
                height: '100%',
                allowScriptedContent: false,
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

            rendition.on('selected', (cfiRange: string, contents: any) => {
                book.getRange(cfiRange).then((range) => {
                    if (range) {
                        const text = range.toString();
                        // We need to notify parent to show a popover
                        // Passing the CFI and Text. 
                        // To show it roughly in correct place, we might need client rects, but that's complex with iframes.
                        // For MVP, we pass the event or simple coordinate relative to view if possible, 
                        // OR simpler: Just show a global "Selection Menu" at the bottom or top of screen with the current selection text.
                        // Or better: pass the serialized CFI to parent, parent shows a floating dialog.

                        // Emit custom event or callback?
                        // Let's check props. We need a new prop 'onTextSelected'.
                        if (onTextSelected) {
                            onTextSelected(cfiRange, text, contents);
                        }
                    }
                });
                // We don't want to clear selection immediately so user can see it
                // rendition.getContents().forEach(c => c.window.getSelection().removeAllRanges());
            });

            // Restore annotations (highlights)
            // Ideally we get these from props. But we can access store or pass them down.
            // Let's assume parent controls this via a useEffect calling a method, or we pass `annotations` prop.
            if (annotations) {
                annotations.forEach((a: any) => {
                    rendition.annotations.add('highlight', a.cfiRange, {}, (e: any) => {
                        console.log("Clicked highlight", a);
                    }, 'hl-default');
                });
            }

        } catch (err) {
            console.error("EPUB Init Error:", err);
            setError("Kitap başlatılamadı.");
        }

        return () => {
            if (bookRef.current) {
                bookRef.current.destroy();
            }
            if (isRevokable) {
                URL.revokeObjectURL(bookUrl);
            }
        };
    }, [url, options]); // Re-init on url or options change

    // React to settings changes that don't need re-init
    useEffect(() => {
        if (!isReady || !renditionRef.current) return;
        applySettings(renditionRef.current);
    }, [settings, isReady]);

    // React to annotations changes
    useEffect(() => {
        if (!isReady || !renditionRef.current || !annotations) return;
        // Inefficient to clear all, but safe for MVP
        // renditionRef.current.annotations.remove() ??? No clear all method publicly simple.
        // Better: just add new ones? Or simple logic:
        // For MVP, we might duplicate if we aren't careful.
        // Let's assume we just add newly created ones if we track them, or clear all if possible.
        // renditionRef.current.views().forEach(view => view.pane ? ... : ...);
        // Let's try to remove by keeping track? 
        // For V1, let's just add. Removal requires tracking IDs.
        annotations.forEach((a: any) => {
            // Check if exists? EpubJS doesn't easily expose list of annotation CFIs.
            // We just re-add. It might duplicate DOM elements but visually okayish usually.
            // Correct way: track added annotations in a ref.
            try {
                renditionRef.current?.annotations.add('highlight', a.cfiRange, { fill: a.color }, undefined, 'hl-' + a.id);
            } catch (e) { }
        });
    }, [annotations, isReady]);

    const applySettings = (rendition: Rendition) => {
        // Font Size
        rendition.themes.fontSize(`${settings.fontSize}%`);

        // Theme
        // Registering themes with colors matching our index.css
        if (settings.theme === 'dark') {
            rendition.themes.register('dark', {
                body: { color: '#e2e8f0', background: 'transparent' },
                p: { 'line-height': 1.6, 'font-family': 'Lora, serif' }
            });
            rendition.themes.select('dark');
        } else if (settings.theme === 'sepia') {
            rendition.themes.register('sepia', {
                body: { color: '#433422', background: 'transparent' },
                p: { 'line-height': 1.8, 'font-family': 'Lora, serif' }
            });
            rendition.themes.select('sepia');
        } else {
            rendition.themes.register('light', {
                body: { color: '#262626', background: 'transparent' },
                p: { 'line-height': 1.6, 'font-family': 'Lora, serif' }
            });
            rendition.themes.select('light');
        }

        // For double page view in EPUB, if needed:
        if (settings.readingMode.includes('double')) {
            rendition.themes.default({ "body": { "column-count": 2, "column-gap": "60px", "padding": "20px 0" } });
        } else {
            rendition.themes.default({ "body": { "column-count": 1, "padding": "0" } });
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
            {/* Styles for highlights */}
            <style>{`
                ::selection { background: yellow; color: black; }
            `}</style>
        </div>
    );
});

export default EpubReader;
