
import React from 'react';
import { useBookStore } from '@/stores/useStore';
import { Book } from '@/lib/mock-api';
import SinglePageReader from './modes/SinglePageReader';
import DoubleStatic from './modes/DoubleStatic';
import DoubleAnimated from './modes/DoubleAnimated';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import SplitScreenReader from './modes/SplitScreenReader';

interface ReaderContainerProps {
    book: Book;
    data: string | ArrayBuffer;
    pageNumber?: number;
    secondaryBook: Book | null;
    secondaryData: string | ArrayBuffer | null;
    onLocationChange: (loc: string, pct: number) => void;
    onTotalPages?: (total: number) => void;
    scale?: number;
    onTextSelected?: (cfi: string, text: string) => void;
    annotations?: any[];
    onOpenSettings?: () => void;

    // New split screen props
    activePanel?: 'primary' | 'secondary';
    onPanelActivate?: (panel: 'primary' | 'secondary') => void;
    secondaryPageNumber?: number;
    onSecondaryLocationChange?: (loc: string, pct: number) => void;
    onSecondaryTotalPages?: (total: number) => void;
}

export interface ReaderContainerRef {
    next: () => void;
    prev: () => void;
    goToPercentage?: (pct: number) => void;
    goToSecondaryPercentage?: (pct: number) => void;
    getCurrentText: () => Promise<string>;
    search: (query: string, isRegex?: boolean) => Promise<any[]>;
}

const ReaderContainer = React.forwardRef<ReaderContainerRef, ReaderContainerProps>(({
    book, data, pageNumber, secondaryBook, secondaryData, onLocationChange, ...props
}, ref) => {
    const { settings } = useBookStore();
    const [hasError, setHasError] = React.useState(false);
    const contentRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
        next: () => {
            if (contentRef.current?.next) contentRef.current.next();
        },
        prev: () => {
            if (contentRef.current?.prev) contentRef.current.prev();
        },
        goToPercentage: (pct: number) => {
            if (contentRef.current?.goToPercentage) contentRef.current.goToPercentage(pct);
        },
        goToSecondaryPercentage: (pct: number) => {
            if (contentRef.current?.goToSecondaryPercentage) contentRef.current.goToSecondaryPercentage(pct);
        },
        getCurrentText: async () => {
            return contentRef.current?.getCurrentText ? await contentRef.current.getCurrentText() : '';
        },
        search: async (query: string, isRegex: boolean = false) => {
            return contentRef.current?.search ? await contentRef.current.search(query, isRegex) : [];
        }
    }));

    // Reset error when book changes
    React.useEffect(() => {
        setHasError(false);
    }, [book.id]);

    React.useEffect(() => {
        if (data instanceof ArrayBuffer && data.byteLength === 0) {
            toast.error("Dosya boş görünüyor. Lütfen kitabı tekrar indirin.");
            setHasError(true);
        }
    }, [data]);

    if (hasError) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-red-500">
                <p className="font-bold">Kitap Yüklenemedi</p>
                <p className="text-sm">Dosya verisi hasarlı veya eksik.</p>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex h-full items-center justify-center p-8 space-y-4 flex-col">
                <Skeleton className="h-[60vh] w-full max-w-2xl rounded-xl" />
                <div className="space-y-2 w-full max-w-2xl">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <p className="text-muted-foreground animate-pulse">Kitap hazırlanıyor...</p>
            </div>
        );
    }

    // Debug logging removed for stability


    try {
        switch (settings.readingMode) {
            case 'single':
                return <SinglePageReader ref={contentRef} book={book} data={data} pageNumber={pageNumber} onLocationChange={onLocationChange} onTotalPages={props.onTotalPages} scale={props.scale} onTextSelected={props.onTextSelected} annotations={props.annotations} />;

            case 'double-static':
                return <DoubleStatic ref={contentRef} book={book} data={data} pageNumber={pageNumber} onLocationChange={onLocationChange} onTotalPages={props.onTotalPages} scale={props.scale} onTextSelected={props.onTextSelected} annotations={props.annotations} />;

            case 'double-animated':
                return <DoubleAnimated ref={contentRef} book={book} data={data} pageNumber={pageNumber} onLocationChange={onLocationChange} onTotalPages={props.onTotalPages} scale={props.scale} onTextSelected={props.onTextSelected} annotations={props.annotations} />;

            case 'split':
                return <SplitScreenReader
                    ref={contentRef}
                    primaryBook={book}
                    primaryData={data}
                    primaryPageNumber={pageNumber}
                    onPrimaryLocationChange={onLocationChange}
                    onTotalPages={props.onTotalPages}
                    scale={props.scale}
                    secondaryBook={secondaryBook}
                    secondaryData={secondaryData}
                    secondaryPageNumber={props.secondaryPageNumber}
                    onSecondaryLocationChange={props.onSecondaryLocationChange}
                    onTextSelected={props.onTextSelected}
                    annotations={props.annotations}
                    onOpenSettings={props.onOpenSettings}
                    activePanel={props.activePanel}
                    onPanelActivate={props.onPanelActivate}
                />;

            default:
                return <SinglePageReader ref={contentRef} book={book} data={data} pageNumber={pageNumber} onLocationChange={onLocationChange} onTotalPages={props.onTotalPages} scale={props.scale} onTextSelected={props.onTextSelected} annotations={props.annotations} />;
        }
    } catch (err) {
        console.error("Critical Reader Error:", err);
        toast.error("Okuyucu hatası: " + String(err));
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-red-500 gap-4">
                <h3 className="font-bold text-lg">Beklenmedik Bir Hata Oluştu</h3>
                <p className="text-sm border p-2 rounded bg-red-50 dark:bg-red-950/20">{String(err)}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
                >
                    Sayfayı Yenile
                </button>
            </div>
        );
    }
});

export default ReaderContainer;
