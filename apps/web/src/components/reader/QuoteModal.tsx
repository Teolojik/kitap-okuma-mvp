
import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Twitter, Palette, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import QuoteCard from './QuoteCard';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    selection: { text: string; cfi: string } | null;
    book: { title: string; author: string; cover_url?: string } | null;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, selection, book }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState<'warm' | 'dark' | 'glass' | 'nature'>('warm');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!selection || !book) return null;

    const themes: Array<{ name: string; value: typeof theme }> = [
        { name: 'Sıcak', value: 'warm' },
        { name: 'Koyu', value: 'dark' },
        { name: 'Cam', value: 'glass' },
        { name: 'Doğa', value: 'nature' },
    ];

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // Give a small delay for any animations to settle
            await new Promise(r => setTimeout(r, 100));

            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2, // Higher quality
                backgroundColor: 'transparent',
                style: {
                    borderRadius: '2rem'
                }
            });

            const link = document.createElement('a');
            link.download = `epigraph-quote-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Alıntı kartı başarıyla indirildi!");
        } catch (err) {
            console.error('Quote Generation Error:', err);
            toast.error("Görsel oluşturulurken bir hata oluştu.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTwitterShare = () => {
        const shareText = `"${selection.text.substring(0, 100)}${selection.text.length > 100 ? '...' : ''}"\n\n${book.title} - ${book.author}\n\nOkumak için: https://epigraphreader.com`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-background/60 backdrop-blur-3xl border-white/10 p-0 overflow-hidden rounded-[2.5rem]">
                <DialogHeader className="p-8 border-b border-white/5">
                    <DialogTitle className="text-2xl font-serif">Alıntıyı Paylaş</DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-8 flex flex-col items-center">
                    {/* Live Preview */}
                    <div className="scale-75 sm:scale-90 md:scale-100 origin-center">
                        <QuoteCard
                            ref={cardRef}
                            text={selection.text}
                            author={book.author}
                            title={book.title}
                            coverUrl={book.cover_url}
                            theme={theme}
                        />
                    </div>

                    {/* Controls */}
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 bg-card/50 p-6 rounded-[2rem] border border-white/5">
                        {/* Theme Switcher */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl"><Palette className="h-5 w-5 opacity-60" /></div>
                            <div className="flex gap-2">
                                {themes.map((t) => (
                                    <Button
                                        key={t.value}
                                        variant={theme === t.value ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setTheme(t.value)}
                                        className={`rounded-full px-4 text-xs font-bold uppercase tracking-widest transition-all ${theme === t.value ? 'shadow-lg' : 'hover:bg-white/5'}`}
                                    >
                                        {t.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="rounded-2xl h-12 px-6 gap-2 bg-primary hover:scale-105 transition-transform"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                <span className="font-bold">Görseli İndir</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleTwitterShare}
                                className="rounded-2xl h-12 px-6 gap-2 border-white/10 hover:bg-[#1DA1F2] hover:text-white transition-all hover:scale-105"
                            >
                                <Twitter className="h-4 w-4" />
                                <span className="font-bold">X'te Paylaş</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuoteModal;
