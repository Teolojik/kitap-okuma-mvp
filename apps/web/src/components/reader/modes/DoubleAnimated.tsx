
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EpubReader, { EpubReaderRef } from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';

interface DoubleAnimatedProps {
    book: Book;
    data: string | ArrayBuffer;
    onLocationChange: (loc: string, pct: number) => void;
}

import { getFileType } from '@/lib/file-utils';

export default function DoubleAnimated({ book, data, onLocationChange }: DoubleAnimatedProps) {
    const fileType = getFileType(data, book.title);
    const epubRef = useRef<EpubReaderRef>(null);
    const [direction, setDirection] = useState(0); // -1 prev, 1 next

    if (fileType === 'pdf') {
        return <PdfReader url={data} />;
    }

    // Simulate visual page turn effect
    // We can't easily animate the actual content inside the iframe without unmounting/heavy implementation.
    // Instead, we animate a "shadow" overlay to give the feeling of a page turning.
    const [flipkey, setFlipKey] = useState(0);

    const handleNext = () => {
        setDirection(1);
        setFlipKey(k => k + 1);
        epubRef.current?.next();
    };

    const handlePrev = () => {
        setDirection(-1);
        setFlipKey(k => k + 1);
        epubRef.current?.prev();
    };

    return (
        <div className="h-full w-full relative bg-[#f6f1d1]/20 overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10 shadow-lg" />

            <EpubReader
                ref={epubRef}
                url={data}
                initialLocation={book.progress?.location as string}
                onLocationChange={onLocationChange}
                options={EPUB_OPTIONS}
            />

            {/* Flip Animation Overlay */}
            <AnimatePresence>
                {flipkey > 0 && (
                    <motion.div
                        key={flipkey}
                        initial={{ x: direction === 1 ? '100%' : '-100%', opacity: 0 }}
                        animate={{ x: '0%', opacity: [0, 0.5, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-r from-transparent via-black/10 to-transparent"
                    />
                )}
            </AnimatePresence>

            <div className="absolute inset-y-0 left-0 w-24 z-20 cursor-pointer hover:bg-gradient-to-r from-black/10 to-transparent transition-all"
                onClick={handlePrev} title="Önceki Sayfa" />
            <div className="absolute inset-y-0 right-0 w-24 z-20 cursor-pointer hover:bg-gradient-to-l from-black/10 to-transparent transition-all"
                onClick={handleNext} title="Sonraki Sayfa" />
        </div>
    );
}

const EPUB_OPTIONS = { flow: 'paginated', manager: 'default' };
