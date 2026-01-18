
import React, { useRef, Suspense, lazy } from 'react';
import { Book } from '@/lib/mock-api';

const EpubReader = lazy(() => import('../EpubReader'));
const PdfReader = lazy(() => import('../PdfReader'));

interface DoubleStaticProps {
    book: Book;
    data: string | ArrayBuffer;
    pageNumber?: number;
    onLocationChange: (loc: string, pct: number) => void;
    onTotalPages?: (total: number) => void;
    scale?: number;
    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
}

const EPUB_OPTIONS = {
    flow: 'paginated',
    manager: 'default',
    width: '100%',
    height: '100%',
    spread: 'always'
};

import { getFileType } from '@/lib/file-utils';

const DoubleStatic = React.forwardRef<any, DoubleStaticProps>(({
    book, data, pageNumber, onLocationChange, onTotalPages, scale, onTextSelected, annotations
}, ref) => {
    if (book.format === 'pdf') {
        return (
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">PDF Motoru Hazırlanıyor...</div>}>
                <PdfReader
                    ref={ref}
                    url={data}
                    pageNumber={pageNumber}
                    onLocationChange={onLocationChange}
                    onTotalPages={onTotalPages}
                    scale={scale}
                    onTextSelected={(page, text) => onTextSelected?.(String(page), text)}
                    annotations={annotations}
                />
            </Suspense>
        );
    }

    return (
        <div className="h-full w-full relative overflow-hidden">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">EPUB Motoru Hazırlanıyor...</div>}>
                <EpubReader
                    ref={ref}
                    url={data}
                    initialLocation={book.progress?.location as string}
                    onLocationChange={onLocationChange}
                    onTextSelected={onTextSelected}
                    onTotalPages={onTotalPages}
                    annotations={annotations}
                    options={EPUB_OPTIONS}
                />
            </Suspense>
            {/* Simple Navigation Overlay */}
            <div className="absolute inset-y-0 left-0 w-16 z-20 cursor-pointer hover:bg-black/5 transition-colors" onClick={() => (ref as any).current?.prev()} title="Önceki" />
            <div className="absolute inset-y-0 right-0 w-16 z-20 cursor-pointer hover:bg-black/5 transition-colors" onClick={() => (ref as any).current?.next()} title="Sonraki" />
        </div>
    );
});

export default DoubleStatic;
