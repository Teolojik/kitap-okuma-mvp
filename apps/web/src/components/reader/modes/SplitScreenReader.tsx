import React, { useRef, useImperativeHandle } from 'react';
import EpubReader from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';
import { BookOpen } from 'lucide-react';
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

    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
    onOpenSettings?: () => void;

    activePanel?: 'primary' | 'secondary';
    onPanelActivate?: (panel: 'primary' | 'secondary') => void;
}

const EPUB_OPTIONS = { flow: 'paginated', manager: 'default' };

const SplitScreenReader = React.forwardRef<any, SplitScreenProps>(({
    primaryBook, primaryData, primaryPageNumber, onPrimaryLocationChange, onTotalPages, scale,
    secondaryBook, secondaryData, secondaryPageNumber, onSecondaryLocationChange,
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
            else secondaryRef.current?.next();
        },
        prev: () => {
            if (activePanel === 'primary') primaryRef.current?.prev();
            else secondaryRef.current?.prev();
        }
    }));

    return (
        <div className="grid grid-cols-2 h-full w-full divide-x-4 divide-border/20">
            {/* Left Side (Primary) */}
            <div
                className={`relative h-full w-full overflow-hidden transition-all duration-300 ${activePanel === 'primary' ? 'ring-inset ring-4 ring-primary/20 bg-background' : 'bg-background/50 hover:bg-background/80'}`}
                onClick={() => onPanelActivate?.('primary')}
            >
                {primaryType === 'pdf' ? (
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
                ) : (
                    <div className="h-full w-full relative">
                        <EpubReader
                            ref={primaryRef}
                            url={primaryData}
                            initialLocation={primaryBook.progress?.location as string}
                            onLocationChange={onPrimaryLocationChange}
                            onTextSelected={onTextSelected}
                            annotations={annotations}
                            options={EPUB_OPTIONS}
                        />
                    </div>
                )}
                <div className={`absolute top-4 left-4 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border z-30 pointer-events-none shadow-2xl transition-colors duration-300 ${activePanel === 'primary' ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-background/80 border-border/20'}`}>
                    {cleanTitle(primaryBook.title).length > 30 ? cleanTitle(primaryBook.title).substring(0, 30) + '...' : cleanTitle(primaryBook.title)}
                </div>
            </div>

            {/* Right Side (Secondary) */}
            <div
                className={`relative h-full w-full overflow-hidden transition-all duration-300 ${activePanel === 'secondary' ? 'ring-inset ring-4 ring-primary/20 bg-background' : 'bg-background/50 hover:bg-background/80'}`}
                onClick={() => onPanelActivate?.('secondary')}
            >
                {secondaryBook && secondaryData ? (
                    secondaryType === 'pdf' ? (
                        <PdfReader
                            ref={secondaryRef}
                            url={secondaryData}
                            simpleMode
                            pageNumber={secondaryPageNumber || 1}
                            onLocationChange={(loc, pct) => onSecondaryLocationChange?.(loc, pct)}
                            scale={activePanel === 'secondary' ? scale : scale}
                        />
                    ) : (
                        <EpubReader
                            ref={secondaryRef}
                            url={secondaryData}
                            initialLocation={secondaryBook.progress?.location as string}
                            onLocationChange={onSecondaryLocationChange}
                            options={EPUB_OPTIONS}
                        />
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
                    <div className={`absolute top-4 right-4 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border z-30 pointer-events-none shadow-2xl transition-colors duration-300 ${activePanel === 'secondary' ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-background/80 border-border/20'}`}>
                        {cleanTitle(secondaryBook.title).length > 30 ? cleanTitle(secondaryBook.title).substring(0, 30) + '...' : cleanTitle(secondaryBook.title)}
                    </div>
                )}
            </div>
        </div>
    );
});

export default SplitScreenReader;
