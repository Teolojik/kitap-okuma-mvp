
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
    secondaryBook: Book | null;
    secondaryData: string | ArrayBuffer | null;
    onLocationChange: (loc: string, pct: number) => void;
}

export default function ReaderContainer({
    book, data, secondaryBook, secondaryData, onLocationChange
}: ReaderContainerProps) {
    const { settings } = useBookStore();
    const [hasError, setHasError] = React.useState(false);

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

    // Debug logging
    React.useEffect(() => {
        console.log(`[Reader] Mode: ${settings.readingMode}, ID: ${book.id}`);
    }, [book, data, settings.readingMode]);

    try {
        switch (settings.readingMode) {
            case 'single':
                return <SinglePageReader book={book} data={data} onLocationChange={onLocationChange} />;

            case 'double-static':
                return <DoubleStatic book={book} data={data} onLocationChange={onLocationChange} />;

            case 'double-animated':
                return <DoubleAnimated book={book} data={data} onLocationChange={onLocationChange} />;

            case 'split':
                return <SplitScreenReader
                    primaryBook={book}
                    primaryData={data}
                    onPrimaryLocationChange={onLocationChange}
                    secondaryBook={secondaryBook}
                    secondaryData={secondaryData}
                />;

            default:
                return <SinglePageReader book={book} data={data} onLocationChange={onLocationChange} />;
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
}
