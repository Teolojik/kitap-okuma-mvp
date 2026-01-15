
import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker - using generic CDN for MVP to avoid build complexites
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

// Fallback for CDN if local doesn't work well in all envs (optional)
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderProps {
    url: string | ArrayBuffer;
}

export default function PdfReader({ url }: PdfReaderProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border">
                <Button variant="ghost" size="icon" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-16 text-center">{pageNumber} / {numPages || '--'}</span>
                <Button variant="ghost" size="icon" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-2" />
                <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-auto flex justify-center p-4">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="flex items-center justify-center p-10">PDF yükleniyor...</div>}
                    error={<div className="flex items-center justify-center p-10 text-red-500">PDF yüklenemedi.</div>}
                    className="shadow-lg"
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="bg-white"
                    />
                </Document>
            </div>
        </div>
    );
}
