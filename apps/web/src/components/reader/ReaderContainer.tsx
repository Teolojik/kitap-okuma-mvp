
import React from 'react';
import { useBookStore } from '@/stores/useStore';
import { Book } from '@/lib/mock-api';
import SinglePageReader from './modes/SinglePageReader';
import DoubleStatic from './modes/DoubleStatic';
import DoubleAnimated from './modes/DoubleAnimated';
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

    // Debug logging
    React.useEffect(() => {
        console.log(`ReaderContainer mounted. Mode: ${settings.readingMode}`);
        console.log(`Primary Book: ${book.title}, Data Type: ${typeof data}, Length: ${data instanceof ArrayBuffer ? data.byteLength : (data as string).length}`);
        if (data instanceof ArrayBuffer && data.byteLength < 1000) {
            console.warn("Warning: Book data seems unusually small. Potential corrupted download.");
        }
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
