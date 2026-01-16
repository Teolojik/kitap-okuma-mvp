
import React, { useRef } from 'react';
import EpubReader, { EpubReaderRef } from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';

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
        return <PdfReader
            ref={ref}
            url={data}
            pageNumber={pageNumber}
            onPageChange={(p) => onLocationChange(String(p), 0)}
            onTotalPages={onTotalPages}
            scale={scale}
            onTextSelected={(page, text) => onTextSelected?.(String(page), text)}
            annotations={annotations}
        />;
    }

    return (
        <div className="h-full w-full relative">
            <EpubReader
                ref={ref}
                url={data}
                initialLocation={book.progress?.location as string}
                onLocationChange={onLocationChange}
                onTextSelected={onTextSelected}
                annotations={annotations}
                options={EPUB_OPTIONS}
            />
        </div>
    );
});

export default SinglePageReader;
