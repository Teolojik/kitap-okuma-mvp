
import React, { useRef, useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book } from '@/lib/mock-api';

const EpubReader = lazy(() => import('../EpubReader'));
const PdfReader = lazy(() => import('../PdfReader'));

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

const EPUB_OPTIONS = {
    flow: 'paginated',
    manager: 'default',
    spread: 'always'
};

const DoubleAnimated = React.forwardRef<any, DoubleAnimatedProps>(({
    book, data, pageNumber, onLocationChange, onTotalPages, scale, onTextSelected, annotations
}, ref) => {
    const innerReaderRef = useRef<any>(null);
    const [direction, setDirection] = useState(0); // -1 prev, 1 next
    const [flipkey, setFlipKey] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const epubOptions = {
        flow: isMobile ? 'scrolled-doc' : 'paginated',
        manager: isMobile ? 'continuous' : 'default',
        spread: isMobile ? 'none' : 'always',
        width: '100%',
        height: '100%',
    };

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
        return (
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">PDF Motoru Hazırlanıyor...</div>}>
                <PdfReader
                    ref={innerReaderRef}
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
            {!isMobile && (
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10 shadow-lg" />
            )}

            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs font-bold animate-pulse">EPUB Motoru Hazırlanıyor...</div>}>
                <EpubReader
                    ref={innerReaderRef}
                    url={data}
                    initialLocation={book.progress?.location as string}
                    onLocationChange={onLocationChange}
                    onTextSelected={onTextSelected}
                    onTotalPages={onTotalPages}
                    annotations={annotations}
                    options={epubOptions}
                />
            </Suspense>

            {/* Flip Animation Overlay - Only on Desktop */}
            <AnimatePresence mode="wait">
                {flipkey > 0 && !isMobile && (
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

            {/* Navigation Areas */}
            <div className="absolute inset-y-0 left-0 w-16 sm:w-24 z-20 cursor-pointer hover:bg-gradient-to-r from-black/5 to-transparent transition-all active:bg-black/5"
                onClick={handlePrev} title="Önceki Sayfa" />
            <div className="absolute inset-y-0 right-0 w-16 sm:w-24 z-20 cursor-pointer hover:bg-gradient-to-l from-black/5 to-transparent transition-all active:bg-black/5"
                onClick={handleNext} title="Sonraki Sayfa" />
        </div>
    );
});

export default DoubleAnimated;
