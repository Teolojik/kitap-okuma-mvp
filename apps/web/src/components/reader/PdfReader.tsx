
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
    onLocationChange?: (location: string, percentage: number) => void;
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
    getCurrentText: () => Promise<string>;
    search: (query: string) => Promise<any[]>;
}

const PdfReaderInner = React.forwardRef<PdfReaderRef, PdfReaderProps>(({
    url,
    pageNumber: propPageNumber,
    onLocationChange,
    onTotalPages,
    scale: propScale,
    onScaleChange,
    simpleMode = false,
    onTextSelected,
    annotations
}: PdfReaderProps, ref) => {
    const { settings } = useBookStore();
    const [numPages, setNumPages] = useState<number>(0);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    // Use props directly
    const page = propPageNumber || 1;
    // Default scale to 1.0 (Fit Width) instead of 1.2 to prevent overflow
    const currentScale = propScale || 1.0;
    const isDoubleMode = settings.readingMode.includes('double');

    // Callback on load
    const onDocumentLoadSuccess = (pdf: any) => {
        setNumPages(pdf.numPages);
        setPdfDoc(pdf);
        if (onTotalPages) onTotalPages(pdf.numPages);
    };

    // Imperative Handle strictly triggers callbacks now, NO internal state mutation
    React.useImperativeHandle(ref, () => ({
        next: () => {
            const nextP = page + (isDoubleMode ? 2 : 1);
            if (nextP <= numPages && onLocationChange) {
                const pct = numPages > 0 ? (nextP / numPages) * 100 : 0;
                onLocationChange(String(nextP), pct);
            }
        },
        prev: () => {
            const prevP = page - (isDoubleMode ? 2 : 1);
            if (prevP >= 1 && onLocationChange) {
                const pct = numPages > 0 ? (prevP / numPages) * 100 : 0;
                onLocationChange(String(prevP), pct);
            }
        },
        getCurrentText: async () => {
            if (!pdfDoc) return '';
            try {
                const extractPageText = async (pNum: number) => {
                    const pageObj = await pdfDoc.getPage(pNum);
                    const textContent = await pageObj.getTextContent();
                    return textContent.items.map((item: any) => item.str).join(' ');
                };

                let text = await extractPageText(page);
                if (isDoubleMode && page + 1 <= numPages) {
                    text += ' ' + await extractPageText(page + 1);
                }
                return text.replace(/\s+/g, ' ').trim();
            } catch (e) {
                console.error("PDF Text extraction failed", e);
                return '';
            }
        },
        search: async (query: string, isRegex: boolean = false) => {
            if (!pdfDoc) return [];
            const results: any[] = [];

            let searchRegex: RegExp;
            try {
                searchRegex = isRegex ? new RegExp(query, 'gi') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            } catch (e) {
                console.error("Invalid Regex", e);
                return [];
            }

            for (let i = 1; i <= numPages; i++) {
                try {
                    const pageObj = await pdfDoc.getPage(i);
                    const textContent = await pageObj.getTextContent();
                    const text = textContent.items.map((item: any) => item.str).join(' ');

                    // Fast check
                    if (searchRegex.test(text)) {
                        searchRegex.lastIndex = 0; // Reset for multiple matches if needed
                        const match = searchRegex.exec(text);
                        if (match) {
                            const index = match.index;
                            const matchedText = match[0];
                            const excerpt = "..." +
                                text.substring(Math.max(0, index - 40), index) +
                                matchedText +
                                text.substring(index + matchedText.length, Math.min(text.length, index + matchedText.length + 40)) +
                                "...";

                            results.push({
                                cfi: String(i),
                                page: i,
                                excerpt: excerpt,
                                match: matchedText
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Search error on page ${i}`, e);
                }

                if (results.length >= 50) break;
            }
            return results;
        }
    }));
    const [wrapperWidth, setWrapperWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 800);
    const [wrapperHeight, setWrapperHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 600);
    const [pageRatio, setPageRatio] = useState<number>(0.707); // Default A4 ratio
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!wrapperRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    setWrapperWidth(entry.contentRect.width);
                    setWrapperHeight(entry.contentRect.height);
                }
            }
        });
        resizeObserver.observe(wrapperRef.current);
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setWrapperWidth(rect.width);
            setWrapperHeight(rect.height);
        }
        return () => resizeObserver.disconnect();
    }, []);

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



    // Enhanced Fit-to-Page logic
    const getPageWidthConstraint = () => {
        if (!wrapperWidth || !wrapperHeight) return undefined;

        // Margins to account for UI elements + User margins
        const hPadding = (isDoubleMode ? 80 : 40) + (settings.margin * 2);
        const vPadding = (simpleMode ? 40 : 120) + settings.paddingTop + settings.paddingBottom;

        const availableW = Math.max(0, (wrapperWidth - hPadding) / (isDoubleMode ? 2 : 1));
        const availableH = Math.max(0, wrapperHeight - vPadding);

        // Calculate width that fits in height
        const widthToFitHeight = availableH * pageRatio;

        // The effective "Fit" width is the smaller of the two
        const fitWidth = Math.min(availableW, widthToFitHeight);

        // Apply scale on top of the fit width
        return Math.floor(fitWidth * currentScale);
    };

    const calculatedWidth = getPageWidthConstraint();

    if (!safeUrl) return <div className="flex items-center justify-center p-10 font-bold opacity-30 text-xs uppercase tracking-[0.2em]">Dosya Hazırlanıyor...</div>;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative bg-background" ref={wrapperRef}>
            <div className={`w-full h-full flex justify-center items-center no-scrollbar relative ${simpleMode ? '' : 'px-4'} ${currentScale > 1.0 ? 'overflow-auto' : 'overflow-hidden'}`}>
                {/* Book Spine Shadow (Center) */}
                {isDoubleMode && page + 1 <= numPages && (
                    <div className="absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 z-20 pointer-events-none bg-gradient-to-r from-transparent via-black/15 to-transparent blur-md" />
                )}

                <Document
                    file={safeUrl}
                    options={options}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex gap-4 items-center justify-center"
                    loading={
                        <div className="flex items-center justify-center p-10 h-96 w-full">
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                <span className="text-xs font-bold text-primary animate-pulse">PDF Yükleniyor...</span>
                            </div>
                        </div>
                    }
                    error={
                        <div className="flex items-center justify-center p-10 h-96 w-full text-destructive font-bold">
                            PDF Yüklenemedi. Dosya bozuk veya şifreli olabilir.
                        </div>
                    }
                >
                    {/* Primary Page (Left in double mode) - Stacked Effect */}
                    <div className={`shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-300 relative group rounded-sm bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center ${isDoubleMode ? 'rounded-r-none' : ''}`}>
                        {/* Layered Paper Effect (Stacked Pages) */}
                        <div className="absolute top-0 bottom-0 -right-[1px] w-[1px] bg-black/5 z-[2]" />
                        <div className="absolute top-0 bottom-0 -right-[3px] w-[1px] bg-black/[0.02] z-[2]" />

                        <Page
                            pageNumber={page}
                            width={calculatedWidth}
                            onLoadSuccess={(p) => setPageRatio(p.width / p.height)}
                            className="relative z-[1] select-none"
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            loading=""
                        />
                        <style>{`
                            .react-pdf__Page {
                                user-select: none !important;
                                background: transparent !important;
                            }
                            .react-pdf__Page__canvas {
                                pointer-events: none !important;
                                user-select: none !important;
                                z-index: 1 !important;
                                ${pageBgClass ? (pageBgClass.includes('invert') ? 'filter: invert(1) brightness(0.9) contrast(1.1);' : 'filter: sepia(0.3) brightness(0.95) contrast(1.05);') : ''}
                            }
                            .react-pdf__Page__textContent {
                                user-select: text !important;
                                z-index: 20 !important;
                                pointer-events: auto !important;
                                color: transparent !important;
                            }
                            .react-pdf__Page__textContent span::selection {
                                background: rgba(249, 115, 22, 0.3) !important;
                            }
                            /* Dark mode selection fix */
                            ${settings.theme === 'dark' ? `
                            .react-pdf__Page__textContent span::selection {
                                background: rgba(249, 115, 22, 0.4) !important;
                            }
                            ` : ''}
                            .react-pdf__Page__annotations {
                                pointer-events: none !important;
                                z-index: 5 !important;
                            }
                        `}</style>
                        {/* Paper Grain/Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[3] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] mix-blend-multiply" />

                        {/* Inner Paper Shadow (Left Page - Gutter/Spine) */}
                        {isDoubleMode && (
                            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/15 via-black/5 to-transparent pointer-events-none z-[4]" />
                        )}
                    </div>

                    {/* Secondary Page (Right in double mode) - Stacked Effect */}
                    {isDoubleMode && page + 1 <= numPages && (
                        <div className="shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-300 relative group rounded-sm rounded-l-none bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                            {/* Layered Paper Effect (Stacked Pages) */}
                            <div className="absolute top-0 bottom-0 -left-[1px] w-[1px] bg-black/5 z-[2]" />
                            <div className="absolute top-0 bottom-0 -left-[3px] w-[1px] bg-black/[0.02] z-[2]" />

                            {/* Inner Paper Shadow (Right Page - Gutter/Spine) */}
                            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/15 via-black/5 to-transparent pointer-events-none z-[10]" />

                            <Page
                                pageNumber={page + 1}
                                width={calculatedWidth}
                                className="relative z-[1]"
                                renderTextLayer={true}
                                renderAnnotationLayer={false}
                                loading=""
                            />
                            {/* Paper Grain/Texture Overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[11] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] mix-blend-multiply" />
                        </div>
                    )}
                </Document>
            </div>

            {/* Simple Controls if requested (e.g. for secondary reader) */}
            {simpleMode && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                    <span className="text-[10px] bg-background/80 px-2 py-1 rounded-full shadow-sm backdrop-blur-sm tabular-nums">
                        {page} / {numPages}
                    </span>
                </div>
            )}
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
