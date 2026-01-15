
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
}
