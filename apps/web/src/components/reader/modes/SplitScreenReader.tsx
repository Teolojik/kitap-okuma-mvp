
import React from 'react';
import EpubReader from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';
import { BookOpen } from 'lucide-react';
import { useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { cleanTitle } from '@/lib/metadata-utils';

interface SplitScreenProps {
    primaryBook: Book;
    primaryData: string | ArrayBuffer;
    primaryPageNumber?: number;
    onPrimaryLocationChange: (loc: string, pct: number) => void;
    onTotalPages?: (total: number) => void;

    secondaryBook: Book | null;
    secondaryData: string | ArrayBuffer | null;
    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
}

const EPUB_OPTIONS = { flow: 'paginated', manager: 'default' };

import { getFileType } from '@/lib/file-utils';

const SplitScreenReader = React.forwardRef<any, SplitScreenProps>(({
    primaryBook, primaryData, primaryPageNumber, onPrimaryLocationChange, onTotalPages,
    secondaryBook, secondaryData, onTextSelected, annotations
}, ref) => {
    const primaryType = getFileType(primaryData, primaryBook.title);
    const secondaryType = secondaryBook && secondaryData ? getFileType(secondaryData, secondaryBook.title) : null;

    return (
        <div className="grid grid-cols-2 h-full w-full divide-x-4 divide-border/20">
            {/* Left Side (Primary) */}
            <div className="relative h-full w-full overflow-hidden bg-transparent">
                {primaryType === 'pdf' ? (
                    <PdfReader
                        ref={ref}
                        url={primaryData}
                        pageNumber={primaryPageNumber}
                        onPageChange={(p) => onPrimaryLocationChange(String(p), 0)}
                        onTotalPages={onTotalPages}
                        simpleMode
                        onTextSelected={(page, text) => onTextSelected?.(String(page), text)}
                        annotations={annotations}
                    />
                ) : (
                    <div className="h-full w-full relative">
                        <EpubReader
                            ref={ref}
                            url={primaryData}
                            initialLocation={primaryBook.progress?.location as string}
                            onLocationChange={onPrimaryLocationChange}
                            onTextSelected={onTextSelected}
                            annotations={annotations}
                            options={EPUB_OPTIONS}
                        />
                    </div>
                )}
                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-border/20 z-30 pointer-events-none shadow-2xl">
                    {cleanTitle(primaryBook.title).length > 30 ? cleanTitle(primaryBook.title).substring(0, 30) + '...' : cleanTitle(primaryBook.title)}
                </div>
            </div>

            {/* Right Side (Secondary) */}
            <div className="relative h-full w-full overflow-hidden bg-transparent transition-colors duration-500">
                {secondaryBook && secondaryData ? (
                    secondaryType === 'pdf' ? (
                        <PdfReader url={secondaryData} simpleMode />
                    ) : (
                        <EpubReader
                            url={secondaryData}
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
                            onClick={() => document.getElementById('settings-trigger')?.click()}
                        >
                            Kitap Seç
                        </Button>
                    </div>
                )}
                {secondaryBook && (
                    <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-border/20 z-30 pointer-events-none shadow-2xl">
                        {cleanTitle(secondaryBook.title).length > 30 ? cleanTitle(secondaryBook.title).substring(0, 30) + '...' : cleanTitle(secondaryBook.title)}
                    </div>
                )}
            </div>
        </div>
    );
});

export default SplitScreenReader;
