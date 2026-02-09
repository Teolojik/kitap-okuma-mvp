import React, { useRef, useImperativeHandle, Suspense, lazy } from 'react';
import { Book } from '@/lib/mock-api';

const EpubReader = lazy(() => import('../EpubReader'));
const PdfReader = lazy(() => import('../PdfReader'));
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cleanTitle } from '@/lib/metadata-utils';

interface SplitScreenProps {
    primaryBook: Book;
    primaryData: string | ArrayBuffer;
    primaryPageNumber?: number;
    onPrimaryLocationChange: (loc: string, pct: number) => void;
    onTotalPages?: (total: number) => void;
    scale?: number;

    secondaryBook: Book | null;
    secondaryData: string | ArrayBuffer | null;
    secondaryPageNumber?: number;
    onSecondaryLocationChange?: (loc: string, pct: number) => void;
    onSecondaryTotalPages?: (total: number) => void;

    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
    onOpenSettings?: () => void;

    activePanel?: 'primary' | 'secondary';
    onPanelActivate?: (panel: 'primary' | 'secondary') => void;
}

const EPUB_OPTIONS = { flow: 'paginated', manager: 'default' };

const SplitScreenReader = React.forwardRef<any, SplitScreenProps>(({
    primaryBook, primaryData, primaryPageNumber, onPrimaryLocationChange, onTotalPages, scale,
    secondaryBook, secondaryData, secondaryPageNumber, onSecondaryLocationChange, onSecondaryTotalPages,
    onTextSelected, annotations, onOpenSettings,
    activePanel = 'primary', onPanelActivate
}, ref) => {
    const primaryType = primaryBook.format;
    const secondaryType = secondaryBook?.format || null;

    const primaryRef = useRef<any>(null);
    const secondaryRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        next: () => {
            if (activePanel === 'primary') primaryRef.current?.next();
            else if (activePanel === 'secondary') secondaryRef.current?.next();
        },
        prev: () => {
            if (activePanel === 'primary') primaryRef.current?.prev();
            else if (activePanel === 'secondary') secondaryRef.current?.prev();
        },
        goToPercentage: (pct: number) => {
            if (activePanel === 'primary') primaryRef.current?.goToPercentage?.(pct);
            else if (activePanel === 'secondary') secondaryRef.current?.goToPercentage?.(pct);
        },
        goToSecondaryPercentage: (pct: number) => {
            secondaryRef.current?.goToPercentage?.(pct);
        }
    }), [activePanel, primaryRef, secondaryRef]);

    return (
        <div className="grid grid-cols-2 h-full w-full divide-x-4 divide-border/20">
            {/* Left Side (Primary) */}
            <div
                className={`relative h-full w-full overflow-hidden transition-all duration-300 group ${activePanel === 'primary' ? 'ring-inset ring-4 ring-primary/20 bg-background' : 'bg-background/50 hover:bg-background/80'}`}
                onClick={() => onPanelActivate?.('primary')}
            >
                {primaryType === 'pdf' ? (
                    <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">PDF Hazırlanıyor...</div>}>
                        <PdfReader
                            ref={primaryRef}
                            url={primaryData}
                            pageNumber={primaryPageNumber}
                            onLocationChange={(loc, pct) => onPrimaryLocationChange(loc, pct)}
                            onTotalPages={onTotalPages}
                            scale={activePanel === 'primary' ? scale : scale}
                            simpleMode
                            onTextSelected={(page, text) => onTextSelected?.(String(page), text)}
                            annotations={annotations}
                        />
                    </Suspense>
                ) : (
                    <div className="h-full w-full relative">
                        <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">EPUB Hazırlanıyor...</div>}>
                            <EpubReader
                                ref={primaryRef}
                                url={primaryData}
                                initialLocation={primaryBook.progress?.location as string}
                                onLocationChange={onPrimaryLocationChange}
                                onTextSelected={onTextSelected}
                                annotations={annotations}
                                options={EPUB_OPTIONS}
                            />
                        </Suspense>
                    </div>
                )}
                <div className={`absolute top-4 left-4 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border z-30 pointer-events-none shadow-2xl transition-all duration-300 ${activePanel === 'primary' ? 'bg-primary text-primary-foreground border-primary/20 scale-110 shadow-primary/20' : 'bg-background/80 border-border/20 opacity-60'}`}>
                    {activePanel === 'primary' && <span className="mr-2 px-1.5 py-0.5 bg-white/20 rounded-md animate-pulse">AKTİF</span>}
                    {cleanTitle(primaryBook.title).length > 30 ? cleanTitle(primaryBook.title).substring(0, 30) + '...' : cleanTitle(primaryBook.title)}
                </div>

                {/* Independent Controls for Primary */}
                <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-start z-40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                        id="nav-btn-1"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); primaryRef.current?.prev(); onPanelActivate?.('primary'); }}
                        className="h-20 w-10 rounded-r-3xl bg-background/40 backdrop-blur-md border border-border/10 hover:bg-primary/20 hover:text-primary transition-all shadow-xl"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                </div>
                <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-end z-40 opacity-0 group-hover:opacity-100 transition-all duration-300 pr-2">
                    <Button
                        id="nav-btn-2"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); primaryRef.current?.next(); onPanelActivate?.('primary'); }}
                        className="h-20 w-10 rounded-l-3xl bg-background/40 backdrop-blur-md border border-border/10 hover:bg-primary/20 hover:text-primary transition-all shadow-xl"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Right Side (Secondary) */}
            <div
                className={`relative h-full w-full overflow-hidden transition-all duration-300 group ${activePanel === 'secondary' ? 'ring-inset ring-4 ring-primary/20 bg-background' : 'bg-background/50 hover:bg-background/80'}`}
                onClick={() => onPanelActivate?.('secondary')}
            >
                {secondaryBook && secondaryData ? (
                    secondaryType === 'pdf' ? (
                        <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">PDF Hazırlanıyor...</div>}>
                            <PdfReader
                                ref={secondaryRef}
                                url={secondaryData}
                                simpleMode
                                pageNumber={secondaryPageNumber || 1}
                                onLocationChange={(loc, pct) => onSecondaryLocationChange?.(loc, pct)}
                                onTotalPages={onSecondaryTotalPages}
                                scale={activePanel === 'secondary' ? scale : scale}
                            />
                        </Suspense>
                    ) : (
                        <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">EPUB Hazırlanıyor...</div>}>
                            <EpubReader
                                ref={secondaryRef}
                                url={secondaryData}
                                initialLocation={secondaryBook.progress?.location as string}
                                onLocationChange={onSecondaryLocationChange}
                                onTotalPages={onSecondaryTotalPages}
                                options={EPUB_OPTIONS}
                            />
                        </Suspense>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-secondary/20 flex items-center justify-center mb-2 shadow-inner">
                            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-sm font-semibold tracking-tight">İkinci kitap seçilmedi</p>
                            <p className="text-muted-foreground/40 text-[10px] uppercase font-bold tracking-widest">Yan yana okumak için bir kitap seçin</p>
                        </div>
                        <Button
                            variant="secondary"
                            className="rounded-full px-8 py-6 h-auto text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-primary/10 transition-all active:scale-95 bg-primary text-white hover:bg-primary/90"
                            onClick={onOpenSettings}
                        >
                            Kitap Seç
                        </Button>
                    </div>
                )}
                {secondaryBook && (
                    <div className={`absolute top-4 right-4 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border z-30 pointer-events-none shadow-2xl transition-all duration-300 ${activePanel === 'secondary' ? 'bg-primary text-primary-foreground border-primary/20 scale-110 shadow-primary/20' : 'bg-background/80 border-border/20 opacity-60'}`}>
                        {activePanel === 'secondary' && <span className="mr-2 px-1.5 py-0.5 bg-white/20 rounded-md animate-pulse">AKTİF</span>}
                        {cleanTitle(secondaryBook.title).length > 30 ? cleanTitle(secondaryBook.title).substring(0, 30) + '...' : cleanTitle(secondaryBook.title)}
                    </div>
                )}

                {/* Independent Controls for Secondary */}
                {secondaryBook && (
                    <>
                        <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-start z-40 opacity-0 group-hover:opacity-100 transition-all duration-300 pl-2">
                            <Button
                                id="nav-btn-3"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); secondaryRef.current?.prev(); onPanelActivate?.('secondary'); }}
                                className="h-20 w-10 rounded-r-3xl bg-background/40 backdrop-blur-md border border-border/10 hover:bg-orange-500/20 hover:text-orange-500 transition-all shadow-xl"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </div>
                        <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-end z-40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Button
                                id="nav-btn-4"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); secondaryRef.current?.next(); onPanelActivate?.('secondary'); }}
                                className="h-20 w-10 rounded-l-3xl bg-background/40 backdrop-blur-md border border-border/10 hover:bg-orange-500/20 hover:text-orange-500 transition-all shadow-xl"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export default SplitScreenReader;
