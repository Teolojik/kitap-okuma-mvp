
import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker for Vite
// Configure worker for Vite using standard URL constructor which is more robust
// than ?url import if there are resolution issues
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PdfReaderProps {
    url: string | ArrayBuffer;
    pageNumber?: number;
    onPageChange?: (page: number) => void;
    scale?: number;
    onScaleChange?: (scale: number) => void;
    simpleMode?: boolean; // If true, hides internal controls (for custom modes)
}

export default function PdfReader({
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

    const page = propPageNumber || internalPage;
    const currentScale = propScale || internalScale;

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
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
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
