
import React, { useRef, Suspense, lazy } from 'react';
import { Book } from '@/lib/mock-api';

const EpubReader = lazy(() => import('../EpubReader'));
const PdfReader = lazy(() => import('../PdfReader'));

interface SinglePageReaderProps {
    book: Book;
    data: string | ArrayBuffer;
    pageNumber?: number;
    onLocationChange: (loc: string, pct: number) => void;
    onTotalPages?: (total: number) => void;
    scale?: number;
    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
}

// Static options to prevent re-init loop
const EPUB_OPTIONS = { flow: 'scrolled-doc', manager: 'continuous' };

import { getFileType } from '@/lib/file-utils';

const SinglePageReader = React.forwardRef<any, SinglePageReaderProps>(({
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
        <div className="h-full w-full relative">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">Okuyucu Hazırlanıyor...</div>}>
                <EpubReader
                    ref={ref}
                    url={data}
                    initialLocation={book.progress?.location as string}
                    onLocationChange={onLocationChange}
                    onTotalPages={onTotalPages}
                    onTextSelected={onTextSelected}
                    annotations={annotations}
                    options={EPUB_OPTIONS}
                />
            </Suspense>
        </div>
    );
});

export default SinglePageReader;
