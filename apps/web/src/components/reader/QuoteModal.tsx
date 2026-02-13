import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Palette, Loader2, Share2, Lock, Copy, User, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
    const [theme, setTheme] = useState<'warm' | 'dark' | 'glass' | 'nature'>('warm');
    const [isGenerating, setIsGenerating] = useState(false);

    // Editable metadata state
    const [displayTitle, setDisplayTitle] = useState(book?.title || '');
    const [displayAuthor, setDisplayAuthor] = useState(book?.author || '');
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
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // 1. Generate PNG directly from the card wrapper
            // High pixelRatio and no background ensures shadows are captured beautifully
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 3, // Ultra crisp
                backgroundColor: 'transparent',
                style: {
                    padding: '0px',
                    margin: '0px'
                }
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `epigraph-quote-${new Date().getTime()}.png`, { type: 'image/png' });

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // 2. Try Web Share API ONLY on Mobile
            if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'epigraphreader.com Alıntısı',
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

                // X (Twitter) URL with text snippet for social card crawler
                // This link isn't opened, but it defines the 'og' data for the shared snapshot
                const shareUrl = `https://epigraphreader.com/api/share?img=${encodeURIComponent(dataUrl)}&title=${encodeURIComponent(displayTitle)}&author=${encodeURIComponent(displayAuthor)}&text=${encodeURIComponent(selection.text.substring(0, 160))}`;
                console.log("Viral payload generated:", shareUrl);

                toast.success("Görsel panoya kopyalandı! Dilediğiniz yere yapıştırabilirsiniz.");
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
            <DialogContent className="w-full max-w-[95vw] sm:max-w-[680px] max-h-[95vh] bg-background/90 backdrop-blur-3xl border-white/10 p-0 overflow-hidden rounded-3xl shadow-2xl">
                <DialogHeader className="px-6 py-3 border-b border-white/5 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-base font-serif opacity-70">Alıntıyı Paylaş</DialogTitle>
                        <DialogDescription className="sr-only">Seçili alıntıyı kart olarak paylaş</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="px-6 py-4 space-y-4 bg-secondary/20">
                    {/* Metadata Editors */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                            <Input
                                value={displayTitle}
                                onChange={(e) => setDisplayTitle(e.target.value)}
                                placeholder="Kitap Başlığı"
                                className="h-9 pl-9 bg-background/50 border-white/5 text-[11px] font-bold rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40"
                            />
                        </div>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                            <Input
                                value={displayAuthor}
                                onChange={(e) => setDisplayAuthor(e.target.value)}
                                placeholder="Yazar Adı"
                                className="h-9 pl-9 bg-background/50 border-white/5 text-[11px] font-bold rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40"
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
                                    ? 'hover:bg-orange-500 hover:text-white'
                                    : 'opacity-50 cursor-not-allowed grayscale'
                                    }`}
                                title={!isAuthenticated ? "Sadece kayıtlı kullanıcılar paylaşabilir" : ""}
                            >
                                {isAuthenticated ? <Copy className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                <span className="font-bold">Görseli Kopyala</span>
                            </Button>
                        </div>
                    </div>

                    {/* Live Preview — maximized to fill modal */}
                    <div className="w-full flex justify-center items-center overflow-hidden">
                        <div ref={cardRef} className="p-4 bg-transparent">
                            <div className="scale-[0.45] sm:scale-[0.7] md:scale-[0.85] lg:scale-100 origin-center">
                                <QuoteCard
                                    text={selection.text}
                                    author={displayAuthor}
                                    title={displayTitle}
                                    coverUrl={book.cover_url}
                                    theme={theme}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuoteModal;
