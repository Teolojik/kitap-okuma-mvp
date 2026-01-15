
import React, { useRef } from 'react';
import EpubReader, { EpubReaderRef } from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';

interface SinglePageReaderProps {
    book: Book;
    data: string | ArrayBuffer;
    onLocationChange: (loc: string, pct: number) => void;
}

// Static options to prevent re-init loop
const EPUB_OPTIONS = { flow: 'scrolled-doc', manager: 'continuous' };

import { getFileType } from '@/lib/file-utils';

export default function SinglePageReader({ book, data, onLocationChange }: SinglePageReaderProps) {
    const fileType = getFileType(data, book.title);
    const epubRef = useRef<EpubReaderRef>(null);

    if (fileType === 'pdf') {
        return <PdfReader url={data} />;
    }

    return (
        <div className="h-full w-full relative">
            <EpubReader
                ref={epubRef}
                url={data}
                initialLocation={book.progress?.location as string}
                onLocationChange={onLocationChange}
                options={EPUB_OPTIONS}
            />
            {/* Overlay Navigation for better UX in single mode if needed, but 'scrolled' usually implies just scrolling */}
        </div>
    );
}
