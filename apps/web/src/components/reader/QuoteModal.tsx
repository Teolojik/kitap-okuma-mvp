import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Palette, Loader2, Lock, Copy, User, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getFontEmbedCSS, toBlob } from 'html-to-image';
import { toast } from 'sonner';
import QuoteCard from './QuoteCard';
import { useAuthStore } from '@/stores/useStore';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    selection: { text: string; cfi: string } | null;
    book: { title: string; author: string; cover_url?: string } | null;
}

const EXPORT_PIXEL_RATIO = 2;

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, selection, book }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const fontEmbedCssRef = useRef<string | null>(null);
    const [theme, setTheme] = useState<'warm' | 'dark' | 'glass' | 'nature'>('warm');
    const [isGenerating, setIsGenerating] = useState(false);

    const [displayTitle, setDisplayTitle] = useState(book?.title || '');
    const [displayAuthor, setDisplayAuthor] = useState(book?.author || '');
    const { user } = useAuthStore();
    const isAuthenticated = !!user;

    if (!selection || !book) return null;

    const themes: Array<{ name: string; value: typeof theme }> = [
        { name: 'Sýcak', value: 'warm' },
        { name: 'Koyu', value: 'dark' },
        { name: 'Cam', value: 'glass' },
        { name: 'Doða', value: 'nature' },
    ];

    const waitForCaptureReady = async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        if ('fonts' in document) {
            await document.fonts.ready;
        }
    };

    const generateQuoteImageBlob = async (): Promise<Blob> => {
        if (!cardRef.current) {
            throw new Error('Quote card is not mounted');
        }

        const node = cardRef.current;
        await waitForCaptureReady();

        if (!fontEmbedCssRef.current) {
            fontEmbedCssRef.current = await getFontEmbedCSS(node, {
                preferredFontFormat: 'woff2',
            });
        }

        const blob = await toBlob(node, {
            pixelRatio: EXPORT_PIXEL_RATIO,
            backgroundColor: 'transparent',
            cacheBust: true,
            preferredFontFormat: 'woff2',
            fontEmbedCSS: fontEmbedCssRef.current,
        });

        if (!blob) {
            throw new Error('Quote image blob generation failed');
        }

        return blob;
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            const blob = await generateQuoteImageBlob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `epigraph-quote-${Date.now()}.png`;
            link.href = objectUrl;
            link.click();
            URL.revokeObjectURL(objectUrl);
            toast.success('Alýntý kartý baþarýyla indirildi!');
        } catch (err) {
            console.error('Quote Generation Error:', err);
            toast.error('Görsel oluþturulurken bir hata oluþtu.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyImage = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            const blob = await generateQuoteImageBlob();
            const file = new File([blob], `epigraph-quote-${Date.now()}.png`, { type: 'image/png' });
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'epigraphreader.com Alýntýsý',
                    text: `"${selection.text.substring(0, 100)}..."`,
                });
                toast.success('Paylaþým menüsü açýldý!');
                return;
            }

            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                toast.success('Görsel panoya kopyalandý! Dilediðiniz yere yapýþtýrabilirsiniz.');
            } catch (clipboardError) {
                console.error('Clipboard Error:', clipboardError);
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = file.name;
                link.href = objectUrl;
                link.click();
                URL.revokeObjectURL(objectUrl);
                toast.info('Görsel indirildi, istediðiniz yere yükleyebilirsiniz.');
            }
        } catch (err) {
            console.error('Direct Share Error:', err);
            toast.error('Paylaþým hazýrlanýrken bir hata oluþtu.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-[680px] max-h-[95vh] bg-background/90 backdrop-blur-3xl border-white/10 p-0 overflow-hidden rounded-3xl shadow-2xl">
                <DialogHeader className="px-6 py-3 border-b border-white/5 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-base font-serif opacity-70">Alýntýyý Paylaþ</DialogTitle>
                        <DialogDescription className="sr-only">Seçili alýntýyý kart olarak paylaþ</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="px-6 py-4 space-y-4 bg-secondary/20">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                            <Input
                                value={displayTitle}
                                onChange={(e) => setDisplayTitle(e.target.value)}
                                placeholder="Kitap Baþlýðý"
                                className="h-9 pl-9 bg-background/50 border-white/5 text-[11px] font-bold rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40"
                            />
                        </div>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                            <Input
                                value={displayAuthor}
                                onChange={(e) => setDisplayAuthor(e.target.value)}
                                placeholder="Yazar Adý"
                                className="h-9 pl-9 bg-background/50 border-white/5 text-[11px] font-bold rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40"
                            />
                        </div>
                    </div>

                    <div className="w-full flex flex-wrap items-center justify-center gap-2 bg-card/50 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 opacity-50" />
                            <div className="flex gap-1">
                                {themes.map((t) => (
                                    <Button
                                        key={t.value}
                                        variant={theme === t.value ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setTheme(t.value)}
                                        className={`rounded-full px-2.5 py-1 h-7 text-[10px] font-bold uppercase tracking-wider transition-all ${theme === t.value ? 'shadow-md' : 'hover:bg-white/5'}`}
                                    >
                                        {t.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="rounded-xl h-8 px-3 gap-1.5 bg-primary hover:scale-105 transition-transform text-xs"
                            >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                <span className="font-bold">Ýndir</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleCopyImage}
                                disabled={isGenerating || !isAuthenticated}
                                className={`rounded-xl h-8 px-3 gap-1.5 border-white/10 transition-all hover:scale-105 text-xs ${isAuthenticated
                                    ? 'hover:bg-orange-500 hover:text-white'
                                    : 'opacity-50 cursor-not-allowed grayscale'
                                    }`}
                                title={!isAuthenticated ? 'Sadece kayýtlý kullanýcýlar paylaþabilir' : ''}
                            >
                                {isAuthenticated ? <Copy className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                <span className="font-bold">Görseli Kopyala</span>
                            </Button>
                        </div>
                    </div>

                    <div className="w-full flex justify-center items-center">
                        <QuoteCard
                            ref={cardRef}
                            text={selection.text}
                            author={displayAuthor}
                            title={displayTitle}
                            coverUrl={book.cover_url}
                            theme={theme}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuoteModal;
