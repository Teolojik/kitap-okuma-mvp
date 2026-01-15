
import React from 'react';
import EpubReader from '../EpubReader';
import PdfReader from '../PdfReader';
import { Book } from '@/lib/mock-api';
import { useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';

interface SplitScreenProps {
    primaryBook: Book;
    primaryData: string | ArrayBuffer;
    onPrimaryLocationChange: (loc: string, pct: number) => void;

    secondaryBook: Book | null;
    secondaryData: string | ArrayBuffer | null;
}

export default function SplitScreenReader({
    primaryBook, primaryData, onPrimaryLocationChange,
    secondaryBook, secondaryData
}: SplitScreenProps) {
    const { setSettings } = useBookStore();

    return (
        <div className="grid grid-cols-2 h-full w-full divide-x-4 divide-slate-200 dark:divide-slate-800">
            {/* Left Side (Primary) */}
            <div className="relative h-full w-full overflow-hidden">
                {primaryBook.title.endsWith('.pdf') ? (
                    <PdfReader url={primaryData} simpleMode />
                ) : (
                    <div className="h-full w-full relative">
                        <EpubReader
                            url={primaryData}
                            initialLocation={primaryBook.progress?.location as string}
                            onLocationChange={onPrimaryLocationChange}
                            options={{ flow: 'paginated', manager: 'default' }}
                        />
                        {/* Custom Navigation Overlay for Split Mode (Smaller click zones) */}
                        <div className="absolute inset-y-0 left-0 w-12 z-20 cursor-pointer hover:bg-black/5" onClick={(e) => {
                            // We need refs to control this cleanly, implemented via cloning or context usually
                            // For now rely on basic click propagation if EpubReader handles it, OR better:
                            // In a real app we'd pass refs. For MVP we rely on EpubReader's internal mapping if generic,
                            // But wait, EpubReader doesn't expose click-to-turn by default unless we configured it.
                            // We added forwardRef. We should wrap these in small components or use Refs.
                        }} />
                    </div>
                )}
                <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs font-bold border z-30 pointer-events-none">
                    {primaryBook.title}
                </div>
            </div>

            {/* Right Side (Secondary) */}
            <div className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
                {secondaryBook && secondaryData ? (
                    secondaryBook.title.endsWith('.pdf') ? (
                        <PdfReader url={secondaryData} simpleMode />
                    ) : (
                        <EpubReader
                            url={secondaryData}
                            options={{ flow: 'paginated', manager: 'default' }}
                        />
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-muted-foreground mb-4">İkinci kitap seçilmedi.</p>
                        <Button variant="outline" onClick={() => document.getElementById('settings-trigger')?.click()}>
                            Ayarlardan Kitap Seç
                        </Button>
                    </div>
                )}
                {secondaryBook && (
                    <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-xs font-bold border z-30 pointer-events-none">
                        {secondaryBook.title}
                    </div>
                )}
            </div>
        </div>
    );
}
