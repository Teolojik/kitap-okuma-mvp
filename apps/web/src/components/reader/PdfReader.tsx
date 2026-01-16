
import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker to use the local file served via vite-plugin-static-copy
// Using a root-relative path ensures the worker is loaded from our own server
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

import { ErrorBoundary } from 'react-error-boundary';
import { useBookStore } from '@/stores/useStore';
import { Separator } from '@/components/ui/separator';

interface PdfReaderProps {
    url: string | ArrayBuffer;
    pageNumber?: number;
    onPageChange?: (page: number) => void;
    onTotalPages?: (total: number) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    simpleMode?: boolean;
    onTextSelected?: (page: number, text: string) => void;
    annotations?: any[];
}

export interface PdfReaderRef {
    next: () => void;
    prev: () => void;
}

const PdfReaderInner = React.forwardRef<PdfReaderRef, PdfReaderProps>(({
    url,
    pageNumber: propPageNumber,
    onPageChange,
    onTotalPages,
    scale: propScale,
    onScaleChange,
    simpleMode = false,
    onTextSelected,
    annotations
}: PdfReaderProps, ref) => {
    const { settings } = useBookStore();
    const [numPages, setNumPages] = useState<number>(0);
    const [internalPage, setInternalPage] = useState(1);
    const [internalScale, setInternalScale] = useState(1.0);
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    const page = propPageNumber || internalPage;
    const currentScale = propScale || internalScale;
    const isDoubleMode = settings.readingMode.includes('double');

    React.useImperativeHandle(ref, () => ({
        next: () => {
            const nextP = page + (isDoubleMode ? 2 : 1);
            if (nextP <= numPages) {
                if (onPageChange) onPageChange(nextP);
                else setInternalPage(nextP);
            }
        },
        prev: () => {
            const prevP = page - (isDoubleMode ? 2 : 1);
            if (prevP >= 1) {
                if (onPageChange) onPageChange(prevP);
                else setInternalPage(prevP);
            }
        }
    }));
    const pageBgClass = settings.theme === 'dark'
        ? 'invert brightness-90 contrast-110'
        : settings.theme === 'sepia'
            ? 'sepia-[0.3] brightness-[0.95] contrast-[1.05]'
            : '';

    // Memoize options
    const options = React.useMemo(() => ({
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/',
        wasmUrl: '/wasm/',
        imageResourcesPath: '/image_decoders/',
    }), []);

    React.useEffect(() => {
        let objectUrl = '';
        let isRevocable = false;

        if (url instanceof ArrayBuffer) {
            const blob = new Blob([url], { type: 'application/pdf' });
            objectUrl = URL.createObjectURL(blob);
            isRevocable = true;
            setSafeUrl(objectUrl);
        } else if (typeof url === 'string') {
            setSafeUrl(url);
        }

        return () => {
            if (isRevocable && objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url]);

    React.useEffect(() => {
        const handleMouseUp = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                const text = selection.toString();
                if (onTextSelected) onTextSelected(page, text);
            }
        };
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [page, onTextSelected]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        if (onTotalPages) onTotalPages(numPages);
    }

    if (!safeUrl) return <div className="flex items-center justify-center p-10 font-bold opacity-30 text-xs uppercase tracking-[0.2em]">Dosya Hazırlanıyor...</div>;

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden relative selection:bg-primary/30">
            <div className="flex-1 overflow-auto flex justify-center pt-8 pb-32 no-scrollbar scroll-smooth">
                <Document
                    file={safeUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    options={options}
                    loading={<div className="flex items-center justify-center p-20 font-serif italic text-muted-foreground animate-pulse">Sayfa Yapısı Oluşturuluyor...</div>}
                    className="flex gap-6 lg:gap-16 items-start"
                >
                    <div className={`${pageBgClass} transition-all duration-700 bg-transparent overflow-hidden`}>
                        <Page
                            pageNumber={page}
                            scale={currentScale}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            className="bg-transparent"
                        />
                    </div>
                    {isDoubleMode && page < numPages && (
                        <div className={`${pageBgClass} transition-all duration-700 bg-transparent overflow-hidden`}>
                            <Page
                                pageNumber={page + 1}
                                scale={currentScale}
                                renderTextLayer={true}
                                renderAnnotationLayer={false}
                                className="bg-transparent"
                            />
                        </div>
                    )}
                </Document>
            </div>
        </div>
    );
});

const PdfReader = React.forwardRef<PdfReaderRef, PdfReaderProps>((props, ref) => {
    return (
        <ErrorBoundary fallback={<div className="p-4 text-red-500">PDF Görüntüleyici Hatası. Lütfen sayfayı yenileyin.</div>}>
            <PdfReaderInner {...props} ref={ref} />
        </ErrorBoundary>
    );
});

export default PdfReader;
