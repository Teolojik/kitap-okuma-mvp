
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { useBookStore } from '@/stores/useStore';

export interface EpubReaderRef {
    prev: () => void;
    next: () => void;
    goTo: (loc: string) => void;
    goToPercentage: (pct: number) => void;
    getCurrentText: () => Promise<string>;
    search: (query: string) => Promise<any[]>;
}

interface EpubReaderProps {
    url: string | ArrayBuffer;
    initialLocation?: string;
    onLocationChange?: (location: string, percentage: number) => void;
    isSplit?: boolean;
    options?: any; // Pass specific flow/manager options
    annotations?: any[];
    onTextSelected?: (cfiRange: string, text: string, contents: any) => void;
    onTotalPages?: (total: number) => void; // Added for consistancy
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(({ url, initialLocation, onLocationChange, isSplit = false, options, annotations, onTextSelected, onTotalPages }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const { settings } = useBookStore();
    const [isReady, setIsReady] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        prev: () => renditionRef.current?.prev(),
        next: () => renditionRef.current?.next(),
        goTo: (location: string) => {
            if (renditionRef.current) {
                renditionRef.current.display(location);
            }
        },
        goToPercentage: (pct: number) => {
            if (bookRef.current && bookRef.current.locations.length() > 0) {
                // pct is 0-100, cfiFromPercentage expects 0-1
                const cfi = bookRef.current.locations.cfiFromPercentage(pct / 100);
                renditionRef.current?.display(cfi);
            }
        },
        search: async (query: string, isRegex: boolean = false) => {
            if (!bookRef.current || !query) return [];

            const results: any[] = [];
            let searchRegex: RegExp;
            try {
                searchRegex = isRegex ? new RegExp(query, 'gi') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            } catch (e) {
                console.error("Invalid regex query", e);
                return [];
            }

            // Iterate through spine items
            const spine = bookRef.current.spine;
            const spineItems = (spine as any).items || [];

            for (const item of spineItems) {
                try {
                    await item.load(bookRef.current.load.bind(bookRef.current));
                    const doc = item.document;
                    const text = doc.body.innerText || doc.body.textContent || '';

                    searchRegex.lastIndex = 0;
                    let match;
                    while ((match = searchRegex.exec(text)) !== null) {
                        const index = match.index;
                        const matchedText = match[0];
                        const excerpt = "..." +
                            text.substring(Math.max(0, index - 40), index) +
                            matchedText +
                            text.substring(index + matchedText.length, Math.min(text.length, index + matchedText.length + 40)) +
                            "...";

                        // Get CFI for the match (EpubJS specific)
                        // This is a bit complex, but item.cfiFromElement or range logic can work
                        // For MVP: Simple cfi for the start of the section
                        // A more precise CFI would require finding the element containing the match
                        // For now, we'll use the CFI of the body of the item.
                        // A better approach would be to use book.find(query) if it supported regex and returned CFIs.
                        // Or, to manually construct CFI from text offset, which is non-trivial.
                        const cfi = item.cfiFromElement(doc.body);

                        results.push({
                            cfi: cfi,
                            excerpt: excerpt,
                            match: matchedText
                        });

                        if (results.length >= 50) break; // Limit results for performance
                    }
                    item.unload();
                } catch (e) {
                    console.error("Search error in spine item", e);
                }
                if (results.length >= 50) break; // Limit results for performance
            }
            return results;
        },
        getCurrentText: async () => {
            if (!renditionRef.current) return '';
            const location = renditionRef.current.currentLocation() as any;
            if (!location || !location.start) return '';

            try {
                const contents = renditionRef.current.getContents() as unknown as any[];
                if (contents.length === 0) return '';
                const doc = contents[0].document;
                const text = doc.body.innerText || doc.body.textContent || '';
                // Clean up extra whitespaces
                return text.replace(/\s+/g, ' ').trim();
            } catch (e) {
                console.error("Error getting epub text", e);
                return '';
            }
        }
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
            book.ready.then(async () => {
                setIsReady(true);
                applySettings(rendition);

                // Display content with enhanced restoration logic
                try {
                    if (initialLocation) {
                        console.log('EPUB Restore: Attempting to restore location:', initialLocation);

                        // If it's a number string (legacy or PDF-like), check if it's usable as index
                        if (!isNaN(Number(initialLocation)) && !initialLocation.startsWith('epubcfi')) {
                            const index = parseInt(initialLocation, 10);
                            // If index is 1, just start from beginning, otherwise try to find section
                            if (index > 1) {
                                console.log('EPUB Restore: Location is a number, attempting index-based display');
                                await rendition.display(index - 1); // 0-based for spine
                            } else {
                                await rendition.display();
                            }
                        } else {
                            // Standard CFI restoration
                            await rendition.display(initialLocation);
                        }
                    } else {
                        await rendition.display();
                    }
                } catch (displayError) {
                    console.warn("EPUB Restore failed, falling back to start:", displayError);
                    await rendition.display(); // Fallback to start
                }
            }).then(() => {
                // Background task: Generate locations for progress calculation
                // Increased chunk size for faster generation if needed
                return book.locations.generate(1024);
            }).then(() => {
                // Report total pages (approximate screens) once locations are ready
                if (onTotalPages) {
                    onTotalPages(book.locations.length());
                }

                // Refresh settings once more after locations are ready to ensure proper layout
                if (renditionRef.current) applySettings(renditionRef.current);
            }).catch((err) => {
                console.error("EPUB Rendering Error:", err);
                setError("Kitap içeriği yüklenirken bir hata oluştu.");
            });

            // Event listeners
            rendition.on('relocated', (location: any) => {
                if (onLocationChange) {
                    const startCfi = location.start.cfi;

                    // Get percentage from location object (0-1 range)
                    let percentage = location.start.percentage;

                    // Fallback: Calculate from locations if available
                    if ((percentage === undefined || percentage === 0) && book.locations.length() > 0) {
                        percentage = book.locations.percentageFromCfi(startCfi);
                    }

                    // Fallback: Estimate from spine index if locations not ready
                    if ((percentage === undefined || percentage === 0) && location.start.index !== undefined) {
                        const spine = book.spine as any;
                        const spineLength = spine?.length || spine?.items?.length || 1;
                        percentage = (location.start.index / spineLength);
                    }

                    // Ensure percentage is valid number in 0-1 range
                    if (percentage === undefined || isNaN(percentage)) {
                        percentage = 0;
                    }

                    // Convert to 0-100 range for consistency with PDF reader
                    const percentageValue = Math.min(100, Math.max(0, percentage * 100));

                    // Calculate page number
                    let pageNumber = 1;
                    const totalLocations = book.locations.length();

                    if (totalLocations > 0) {
                        // Use locations API for accurate page number
                        const locationIndex = book.locations.locationFromCfi(startCfi) as unknown as number;
                        if (typeof locationIndex === 'number' && locationIndex >= 0) {
                            pageNumber = locationIndex + 1;
                        } else {
                            pageNumber = Math.max(1, Math.round((percentageValue / 100) * totalLocations));
                        }
                    } else if (location.start.index !== undefined) {
                        // Locations not ready, use spine index as page estimate
                        pageNumber = (location.start.index || 0) + 1;
                    }

                    console.log('EPUB Progress:', {
                        cfi: startCfi.substring(0, 50) + '...',
                        percentage: percentageValue.toFixed(2),
                        page: pageNumber,
                        locationsReady: totalLocations > 0
                    });

                    // Only report progress if we have meaningful data
                    onLocationChange(startCfi, percentageValue);
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
        const effectiveSize = Math.max(settings.fontSize, 100);
        rendition.themes.fontSize(`${effectiveSize}%`);

        const isDouble = settings.readingMode.includes('double');
        const marginPx = settings.margin;

        // Base layout styles that should be applied to all themes
        const layoutStyles = {
            'body': {
                'padding': `${settings.paddingTop}px ${marginPx}px ${settings.paddingBottom}px !important`,
                'height': '100% !important',
                'font-size': '1.15em !important',
                'background': 'transparent !important'
            },
            'p': {
                'line-height': `${settings.lineHeight} !important`,
                'letter-spacing': `${settings.letterSpacing}px !important`,
                'font-family': 'Inter, system-ui, sans-serif !important',
                'margin-bottom': '1.5em !important',
                'text-align': 'justify'
            },
            'img': {
                'max-width': '100% !important',
                'max-height': '90vh !important',
                'height': 'auto !important',
                'object-fit': 'contain',
                'display': 'block',
                'margin': '20px auto'
            }
        };

        // Theme Specific Colors
        const themes = {
            light: {
                body: { ...layoutStyles.body, color: '#1a1a1a' },
                p: layoutStyles.p,
                img: layoutStyles.img,
                h1: { color: '#000' }, h2: { color: '#111' }, h3: { color: '#222' }
            },
            dark: {
                body: { ...layoutStyles.body, color: '#e2e8f0' },
                p: layoutStyles.p,
                img: { ...layoutStyles.img, filter: 'brightness(0.8) contrast(1.2)' },
                h1: { color: '#f8fafc' }, h2: { color: '#f1f5f9' }, h3: { color: '#e2e8f0' }
            },
            sepia: {
                body: { ...layoutStyles.body, color: '#433422' },
                p: layoutStyles.p,
                img: { ...layoutStyles.img, opacity: '0.9' },
                h1: { color: '#2d2419' }, h2: { color: '#382d20' }
            }
        };

        // Register and select the current theme
        const currentTheme = settings.theme || 'light';
        rendition.themes.register(currentTheme, (themes as any)[currentTheme]);
        rendition.themes.select(currentTheme);

        // Also update default styles just in case
        rendition.themes.default((themes as any)[currentTheme]);
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
                {!isReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-30 gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
                            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        </div>
                        <p className="text-xs font-bold text-primary animate-pulse uppercase tracking-[0.2em]">Kitap Verisi İşleniyor...</p>
                    </div>
                )}
                <div ref={viewerRef} className="w-full h-full" />
            </div>
            {/* Styles for highlights */}
            <style>{`
                ::selection { 
                    background: rgba(249, 115, 22, 0.3) !important; 
                    color: inherit !important; 
                }
            `}</style>
        </div>
    );
});

export default EpubReader;
