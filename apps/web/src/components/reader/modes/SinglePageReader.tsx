
import React, { useRef } from 'react';
import EpubReader, { EpubReaderRef } from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';

interface SinglePageReaderProps {
    book: Book;
    data: string | ArrayBuffer;
    onLocationChange: (loc: string, pct: number) => void;
}

export default function SinglePageReader({ book, data, onLocationChange }: SinglePageReaderProps) {
    const isPdf = book.title.endsWith('.pdf');
    const epubRef = useRef<EpubReaderRef>(null);

    if (isPdf) {
        return <PdfReader url={data} />;
    }

    return (
        <div className="h-full w-full relative">
            <EpubReader
                ref={epubRef}
                url={data}
                initialLocation={book.progress?.location as string}
                onLocationChange={onLocationChange}
                options={{ flow: 'scrolled-doc', manager: 'continuous' }}
            />
            {/* Overlay Navigation for better UX in single mode if needed, but 'scrolled' usually implies just scrolling */}
        </div>
    );
}
