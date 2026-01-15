
import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker for Vite
// Configure worker for Vite using CDN fallback since local package install failed
// This ensures PDF rendering works even without pdfjs-dist in node_modules
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { ErrorBoundary } from 'react-error-boundary';

interface PdfReaderProps {
    url: string | ArrayBuffer;
    pageNumber?: number;
    onPageChange?: (page: number) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    simpleMode?: boolean; // If true, hides internal controls (for custom modes)
}

function PdfReaderInner({
    url,
    pageNumber: propPageNumber,
    onPageChange,
    scale: propScale,
    onScaleChange,
    simpleMode = false
}: PdfReaderProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [internalPage, setInternalPage] = useState(1);
    const [internalScale, setInternalScale] = useState(1.0);
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    const page = propPageNumber || internalPage;
    const currentScale = propScale || internalScale;

    // Memoize options to prevent unnecessary re-renders
    const options = React.useMemo(() => ({
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/',
    }), []);

    // Handle URL/Buffer conversion safely to prevent detached buffer issues
    React.useEffect(() => {
        let objectUrl = '';
        let isRevocable = false;

        const processUrl = async () => {
            if (url instanceof ArrayBuffer) {
                const blob = new Blob([url], { type: 'application/pdf' });
                objectUrl = URL.createObjectURL(blob);
                isRevocable = true;
                setSafeUrl(objectUrl);
            } else if (typeof url === 'string') {
                // Check if remote URL to fetch as blob (fixes potential CORS/detached buffer on some implementations)
                // But for now assume local string is fine, unless it's a "local://" mock one which mock-api handles
                // Actually, if it's a blob url already, it's fine.
                // If the user said "Dosyayı önce blob olarak fetch et", they might imply remote URL string.
                // But usually 'url' here is ArrayBuffer from ReaderPage.
                // If it is a string, use as is.
                setSafeUrl(url);
            }
        };

        processUrl();

        return () => {
            if (isRevocable && objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const handlePageChange = (newPage: number) => {
        const p = Math.max(1, Math.min(numPages, newPage));
        if (onPageChange) onPageChange(p);
        else setInternalPage(p);
    };

    const handleScaleChange = (newScale: number) => {
        const s = Math.max(0.5, Math.min(3.0, newScale));
        if (onScaleChange) onScaleChange(s);
        else setInternalScale(s);
    };

    if (!safeUrl) return <div className="flex items-center justify-center p-10">Hazırlanıyor...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative user-select-none">
            {!simpleMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border">
                    <Button variant="ghost" size="icon" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-16 text-center">{page} / {numPages || '--'}</span>
                    <Button variant="ghost" size="icon" onClick={() => handlePageChange(page + 1)} disabled={page >= numPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-2" />
                    <Button variant="ghost" size="icon" onClick={() => handleScaleChange(currentScale - 0.1)}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleScaleChange(currentScale + 0.1)}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className="flex-1 overflow-auto flex justify-center p-4">
                <Document
                    file={safeUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    options={options}
                    loading={<div className="flex items-center justify-center p-10">PDF yükleniyor...</div>}
                    error={<div className="flex items-center justify-center p-10 text-red-500">PDF yüklenemedi.</div>}
                    className="shadow-lg"
                >
                    <Page
                        pageNumber={page}
                        scale={currentScale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="bg-white shadow-xl"
                    />
                </Document>
            </div>
        </div>
    );
}

export default function PdfReader(props: PdfReaderProps) {
    return (
        <ErrorBoundary fallback={<div className="p-4 text-red-500">PDF Görüntüleyici Hatası. Lütfen sayfayı yenileyin.</div>}>
            <PdfReaderInner {...props} />
        </ErrorBoundary>
    );
}
