
import React, { useRef } from 'react';
import EpubReader, { EpubReaderRef } from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';

interface DoubleStaticProps {
    book: Book;
    data: string | ArrayBuffer;
    onLocationChange: (loc: string, pct: number) => void;
}

const EPUB_OPTIONS = { flow: 'paginated', manager: 'default', width: '100%', height: '100%' };

export default function DoubleStatic({ book, data, onLocationChange }: DoubleStaticProps) {
    const isPdf = book.title.endsWith('.pdf');
    const epubRef = useRef<EpubReaderRef>(null);

    if (isPdf) {
        // React-PDF doesn't natively support double spread easily in Document without custom layout, 
        // for MVP we fall back to single view or could enforce a wide scale.
        // But let's try to keep it simple.
        return <PdfReader url={data} />;
    }

    return (
        <div className="h-full w-full relative group">
            <EpubReader
                ref={epubRef}
                url={data}
                initialLocation={book.progress?.location as string}
                onLocationChange={onLocationChange}
                options={EPUB_OPTIONS}
            />
            {/* Simple Navigation Overlay */}
            <div className="absolute inset-y-0 left-0 w-16 z-20 cursor-pointer hover:bg-black/5 transition-colors" onClick={() => epubRef.current?.prev()} title="Önceki" />
            <div className="absolute inset-y-0 right-0 w-16 z-20 cursor-pointer hover:bg-black/5 transition-colors" onClick={() => epubRef.current?.next()} title="Sonraki" />
        </div>
    );
}
