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
                pixelRatio: 1.5, // 1800px width which is plenty
                backgroundColor: theme === 'dark' ? '#002b36' : (theme === 'warm' ? '#fdf6e3' : (theme === 'nature' ? '#f0f4f0' : '#1e293b')),
            });

            // Convert dataUrl to Blob
            const blob = await (await fetch(dataUrl)).blob();
            const fileName = `quote-${new Date().getTime()}.png`;
            const filePath = `shares/${fileName}`;

            // 2. Upload to Supabase 'shares' bucket
            const { data, error } = await supabase.storage
                .from('shares')
                .upload(filePath, blob, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (error) throw error;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('shares').getPublicUrl(filePath);

            // 4. Construct Share API URL (Points to our Vercel function)
            const shareApiUrl = `https://epigraphreader.com/api/share?img=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`;

            // 5. Open Twitter Intent with simplified text (Card does the talking)
            const shareText = `"${selection.text.substring(0, 100)}..."`;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareApiUrl)}`;

            window.open(twitterUrl, '_blank');
            toast.success("Görsel X (Twitter) için optimize edildi ve paylaşılıyor!");
        } catch (err) {
            console.error('Native Share Error:', err);
            toast.error("Paylaşım hazırlanırken bir hata oluştu.");
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
