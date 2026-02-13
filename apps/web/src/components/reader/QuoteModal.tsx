import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Twitter, Palette, Loader2, Share2, Lock } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import QuoteCard from './QuoteCard';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useStore';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    selection: { text: string; cfi: string } | null;
    book: { title: string; author: string; cover_url?: string } | null;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, selection, book }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const socialRef = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState<'warm' | 'dark' | 'glass' | 'nature'>('warm');
    const [isGenerating, setIsGenerating] = useState(false);
    const { user } = useAuthStore();
    const isAuthenticated = !!user;

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

    const handleTwitterShare = async () => {
        if (!socialRef.current) return;
        setIsGenerating(true);
        try {
            // 1. Generate PNG for Social (1200x630 Canvas)
            const dataUrl = await toPng(socialRef.current, {
                pixelRatio: 2, // High quality
                backgroundColor: theme === 'dark' ? '#002b36' : (theme === 'warm' ? '#fdf6e3' : (theme === 'nature' ? '#f0f4f0' : '#1e293b')),
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `epigraph-quote-${new Date().getTime()}.png`, { type: 'image/png' });

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // 2. Try Web Share API ONLY on Mobile
            // On desktop (Windows), this opens a clunky menu which we want to avoid.
            if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Epigraph Alıntısı',
                    text: `"${selection.text.substring(0, 100)}..."`
                });
                toast.success("Paylaşım menüsü açıldı!");
                return;
            }

            // 3. Desktop Flow (Clipboard + Open X)
            // X doesn't allow automatic file injection via URL, so we copy & user pastes.
            try {
                // Copy image to clipboard
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);

                // Open X intent
                const shareText = `"${selection.text.substring(0, 100)}..."`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                window.open(twitterUrl, '_blank');

                toast.success("Görsel panoya kopyalandı! X penceresinde Ctrl+V ile yapıştırabilirsiniz.");
            } catch (clipboardError) {
                console.error('Clipboard Error:', clipboardError);
                // Last resort: Just download
                const link = document.createElement('a');
                link.download = file.name;
                link.href = dataUrl;
                link.click();
                toast.info("Görsel indirildi, X'e yükleyebilirsiniz.");
            }
        } catch (err) {
            console.error('Direct Share Error:', err);
            toast.error("Paylaşım hazırlanırken bir hta oluştu.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl max-h-[85vh] bg-background/90 backdrop-blur-3xl border-white/10 p-0 overflow-y-auto rounded-2xl">
                <DialogHeader className="px-5 pt-4 pb-3 border-b border-white/5">
                    <DialogTitle className="text-lg font-serif">Alıntıyı Paylaş</DialogTitle>
                    <DialogDescription className="sr-only">Seçili alıntıyı kart olarak paylaş</DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 space-y-4 flex flex-col items-center">
                    {/* Hidden Capture Area for Social Media (1200x630 - 1.91:1 Ratio) */}
                    <div className="absolute left-[-9999px] top-0 pointer-events-none overflow-hidden">
                        <div
                            id="social-share-capture"
                            ref={socialRef}
                            style={{
                                width: '1200px',
                                height: '630px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: theme === 'dark' ? '#002b36' : (theme === 'warm' ? '#fdf6e3' : (theme === 'nature' ? '#f0f4f0' : '#1e293b')),
                                padding: '40px'
                            }}
                        >
                            <div className="scale-[1.2] origin-center">
                                <QuoteCard
                                    text={selection.text}
                                    author={book.author}
                                    title={book.title}
                                    coverUrl={book.cover_url}
                                    theme={theme}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Live Preview — compact */}
                    <div className="w-full flex justify-center overflow-hidden">
                        <div className="scale-[0.45] sm:scale-[0.55] md:scale-[0.65] origin-top -mb-20 sm:-mb-16 md:-mb-10">
                            <QuoteCard
                                ref={cardRef}
                                text={selection.text}
                                author={book.author}
                                title={book.title}
                                coverUrl={book.cover_url}
                                theme={theme}
                            />
                        </div>
                    </div>

                    {/* Controls — single compact row */}
                    <div className="w-full flex flex-wrap items-center justify-center gap-2 bg-card/50 p-3 rounded-xl border border-white/5">
                        {/* Theme Switcher */}
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

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="rounded-xl h-8 px-3 gap-1.5 bg-primary hover:scale-105 transition-transform text-xs"
                            >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                <span className="font-bold">İndir</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleTwitterShare}
                                disabled={isGenerating || !isAuthenticated}
                                className={`rounded-xl h-8 px-3 gap-1.5 border-white/10 transition-all hover:scale-105 text-xs ${isAuthenticated
                                    ? 'hover:bg-[#1DA1F2] hover:text-white'
                                    : 'opacity-50 cursor-not-allowed grayscale'
                                    }`}
                                title={!isAuthenticated ? "Sadece kayıtlı kullanıcılar paylaşabilir" : ""}
                            >
                                {isAuthenticated ? <Twitter className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                <span className="font-bold">X'ta Paylaş</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuoteModal;
