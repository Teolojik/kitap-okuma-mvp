
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EpubReader, { EpubReaderRef } from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';

interface DoubleAnimatedProps {
    book: Book;
    data: string | ArrayBuffer;
    pageNumber?: number;
    onLocationChange: (loc: string, pct: number) => void;
    onTotalPages?: (total: number) => void;
    scale?: number;
    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
}

import { getFileType } from '@/lib/file-utils';

const EPUB_OPTIONS = { flow: 'paginated', manager: 'default' };

const DoubleAnimated = React.forwardRef<any, DoubleAnimatedProps>(({
    book, data, pageNumber, onLocationChange, onTotalPages, scale, onTextSelected, annotations
}, ref) => {
    const innerReaderRef = useRef<any>(null);
    const [direction, setDirection] = useState(0); // -1 prev, 1 next
    const [flipkey, setFlipKey] = useState(0);

    const handleNext = () => {
        if (innerReaderRef.current?.next) {
            setDirection(1);
            setFlipKey(k => k + 1);
            innerReaderRef.current.next();
        }
    };

    const handlePrev = () => {
        if (innerReaderRef.current?.prev) {
            setDirection(-1);
            setFlipKey(k => k + 1);
            innerReaderRef.current.prev();
        }
    };

    React.useImperativeHandle(ref, () => ({
        next: handleNext,
        prev: handlePrev
    }));

    if (book.format === 'pdf') {
        return <PdfReader
            ref={innerReaderRef}
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
        <div className="h-full w-full relative bg-[#f6f1d1]/20 overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10 shadow-lg" />

            <EpubReader
                ref={innerReaderRef}
                url={data}
                initialLocation={book.progress?.location as string}
                onLocationChange={onLocationChange}
                onTextSelected={onTextSelected}
                annotations={annotations}
                options={EPUB_OPTIONS}
            />

            {/* Flip Animation Overlay */}
            <AnimatePresence mode="wait">
                {flipkey > 0 && (
                    <motion.div
                        key={flipkey}
                        initial={{
                            rotateY: direction === 1 ? 90 : -90,
                            opacity: 0,
                            x: direction === 1 ? '50%' : '-50%'
                        }}
                        animate={{
                            rotateY: 0,
                            opacity: [0, 1, 0],
                            x: '0%'
                        }}
                        exit={{
                            rotateY: direction === 1 ? -90 : 90,
                            opacity: 0,
                            x: direction === 1 ? '-50%' : '50%'
                        }}
                        transition={{ duration: 0.6, ease: "circOut" }}
                        className="absolute inset-0 z-30 pointer-events-none flex"
                        style={{ perspective: '2000px' }}
                    >
                        <div className="flex-1 bg-gradient-to-r from-transparent via-black/5 to-transparent backdrop-blur-[2px] shadow-[inset_0_0_100px_rgba(0,0,0,0.1)]" />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-y-0 left-0 w-24 z-20 cursor-pointer hover:bg-gradient-to-r from-black/5 to-transparent transition-all"
                onClick={handlePrev} title="Önceki Sayfa" />
            <div className="absolute inset-y-0 right-0 w-24 z-20 cursor-pointer hover:bg-gradient-to-l from-black/5 to-transparent transition-all"
                onClick={handleNext} title="Sonraki Sayfa" />
        </div>
    );
});

export default DoubleAnimated;
