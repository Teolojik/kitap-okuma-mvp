
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { MockAPI, Book } from '@/lib/mock-api';
import ReaderContainer, { ReaderContainerRef } from '@/components/reader/ReaderContainer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, ArrowLeft, BookOpen, Columns, Maximize, ChevronDown, BookmarkPlus, ArrowRight, ChevronLeft, ChevronRight, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils';

export default function ReaderPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const readerRef = useRef<ReaderContainerRef>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { books, settings, setSettings, updateProgress, annotations: allAnnotations, bookmarks: allBookmarks } = useBookStore();
    const { user } = useAuthStore();

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const book = books.find(b => b.id === id);
    const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Split Screen State
    const { secondaryBookId, setSecondaryBookId } = useBookStore();
    const [secondaryBook, setSecondaryBook] = useState<Book | null>(null);
    const [secondaryBookData, setSecondaryBookData] = useState<string | ArrayBuffer | null>(null);
    const [isSecondaryLoading, setIsSecondaryLoading] = useState(false);

    const [selection, setSelection] = useState<{ cfi: string; text: string } | null>(null);
    const [totalPages, setTotalPages] = useState<number>(0);

    useEffect(() => {
        if (!id) return;
        const fetchBinary = async () => {
            setIsLoading(true);
            try {
                const blob = await MockAPI.books.getFileBlob(id);
                if (blob) {
                    const arrayBuffer = await blob.arrayBuffer();
                    setBookData(arrayBuffer);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBinary();
    }, [id]);

    useEffect(() => {
        if (settings.readingMode === 'split' && secondaryBookId) {
            loadSecondaryBook(secondaryBookId);
        }
    }, [settings.readingMode, secondaryBookId]);

    const loadSecondaryBook = async (bookId: string) => {
        setIsSecondaryLoading(true);
        try {
            const blob = await MockAPI.books.getFileBlob(bookId);
            if (blob) {
                const arrayBuffer = await blob.arrayBuffer();
                setSecondaryBookData(arrayBuffer);
            }
            const sBook = books.find(b => b.id === bookId);
            if (sBook) setSecondaryBook(sBook);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSecondaryLoading(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') readerRef.current?.next();
            if (e.key === 'ArrowLeft') readerRef.current?.prev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLocationChange = (loc: string, percentage: number) => {
        if (!book) return;
        const pageNum = parseInt(loc);
        let actualPercentage = !isNaN(pageNum) ? percentage : (percentage * 100);

        // If it's a PDF and we have totalPages, calculate percentage manually for better precision
        if (!isNaN(pageNum) && totalPages > 0) {
            actualPercentage = (pageNum / totalPages) * 100;
        }

        updateProgress(book.id, {
            ...book.progress,
            percentage: actualPercentage,
            location: loc,
            page: !isNaN(pageNum) ? pageNum : (book.progress?.page || 1)
        });
    };

    if (isLoading && !bookData) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-background">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="font-serif italic text-muted-foreground animate-pulse text-lg">Kitap Sayfaları Hazırlanıyor...</p>
            </div>
        );
    }

    if (!book || !bookData) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background text-center px-4">
                <div className="w-24 h-24 rounded-[3rem] bg-secondary/20 flex items-center justify-center mb-4">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                    <p className="text-xl font-serif font-bold text-foreground/80">Kitap dosyasına ulaşılamadı</p>
                    <p className="text-sm text-muted-foreground max-w-xs">Dosya kütüphanenizden silinmiş veya hatalı olabilir.</p>
                </div>
                <Button onClick={() => navigate('/')} className="rounded-full px-10 py-6 h-auto text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-primary/10 transition-all active:scale-95 bg-primary text-white hover:bg-primary/90">
                    Kütüphaneye Dön
                </Button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-screen w-full font-serif selection:bg-primary/20 selection:text-primary overflow-hidden transition-colors duration-700 theme-${settings.theme} bg-background text-foreground`}>
            {/* Minimal Floating Header */}
            <div className="absolute top-0 left-0 right-0 h-24 z-[100] group/header flex justify-center pt-4 pointer-events-none">
                <header className="h-14 px-8 rounded-full bg-background/80 backdrop-blur-2xl border border-border/10 shadow-2xl flex items-center justify-between gap-12 opacity-0 group-hover/header:opacity-100 transition-all duration-500 pointer-events-auto hover:scale-[1.01]">
                    <div className="flex flex-col min-w-[120px]">
                        <h1 className="font-bold text-sm tracking-tight leading-none mb-0.5 truncate max-w-[200px]">{cleanTitle(book.title)}</h1>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{cleanAuthor(book.author)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full px-4 h-9 border border-border/10 bg-background/40 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                                    {settings.readingMode === 'single' ? 'TEK SAYFA' :
                                        settings.readingMode === 'double-animated' ? 'ÇİFT (MEKANİK)' :
                                            settings.readingMode === 'double-static' ? 'ÇİFT (STATİK)' : 'YAN YANA'}
                                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px] rounded-2xl p-2 bg-card/95 backdrop-blur-2xl shadow-2xl">
                                {[
                                    { id: 'single', label: 'Tek Sayfa' },
                                    { id: 'double-animated', label: 'Çift (Mekanik)' },
                                    { id: 'double-static', label: 'Çift (Statik)' },
                                    { id: 'split', label: 'Yan Yana (İki Kitap)' }
                                ].map(mode => (
                                    <DropdownMenuItem key={mode.id} className="rounded-xl p-3 cursor-pointer text-[11px] font-bold uppercase tracking-wider" onClick={() => setSettings({ readingMode: mode.id as any })}>
                                        {mode.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center bg-secondary/20 rounded-full p-0.5 border border-border/10">
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all">
                                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                            </Button>

                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button id="settings-trigger" variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all">
                                        <Settings className="h-3.5 w-3.5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] border-l border-border/10 bg-card/95 backdrop-blur-3xl p-0 shadow-2xl">
                                    <div className="h-full flex flex-col p-8 space-y-10 overflow-y-auto no-scrollbar">
                                        <SheetHeader>
                                            <SheetTitle className="text-2xl font-serif font-bold">Okuma Ayarları</SheetTitle>
                                            <SheetDescription className="text-xs">Görünümü özelleştirerek okuma deneyiminizi iyileştirin.</SheetDescription>
                                        </SheetHeader>

                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-1">
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Yazı Boyutu</h3>
                                                    <span className="text-xs font-bold text-primary">%{settings.fontSize}</span>
                                                </div>
                                                <Slider defaultValue={[settings.fontSize]} max={200} min={80} step={5} onValueChange={(v) => setSettings({ fontSize: v[0] })} />
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tema Seçimi</h3>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['light', 'sepia', 'dark'].map((t) => (
                                                        <button key={t} onClick={() => setSettings({ theme: t as any })}
                                                            className={`h-14 rounded-2xl border-2 transition-all flex items-center justify-center font-bold text-[10px] uppercase tracking-wider ${settings.theme === t ? 'border-primary bg-primary/5 text-primary' : 'border-border/30 hover:border-border text-muted-foreground'}`}>
                                                            {t === 'light' ? 'Aydınlık' : t === 'sepia' ? 'Antik' : 'Karanlık'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {settings.readingMode === 'split' && (
                                                <div className="space-y-4 pt-4 border-t border-border/10">
                                                    <div className="flex justify-between items-center px-1">
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Karşılaştırmalı Okuma</h3>
                                                        {!secondaryBookId && <span className="text-[9px] font-bold text-primary animate-pulse">LÜTFEN BİR KİTAP SEÇİN</span>}
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                                                        {books.filter(b => b.id !== id).map(b => (
                                                            <button
                                                                key={b.id}
                                                                onClick={() => setSecondaryBookId(b.id)}
                                                                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all text-left group ${secondaryBookId === b.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/10 bg-secondary/10 hover:border-border/30 hover:bg-secondary/20'}`}
                                                            >
                                                                <div className="w-10 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                                                                    {b.cover_url ? (
                                                                        <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <BookOpen className="h-4 w-4 text-muted-foreground/30" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-bold truncate">{cleanTitle(b.title)}</p>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-hover:text-primary/60">{cleanAuthor(b.author)}</p>
                                                                </div>
                                                                {secondaryBookId === b.id && (
                                                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                                                                )}
                                                            </button>
                                                        ))}
                                                        {books.filter(b => b.id !== id).length === 0 && (
                                                            <div className="py-8 text-center border-2 border-dashed border-border/10 rounded-2xl text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Başka Kitap Bulunmuyor</div>
                                                        )}
                                                    </div>
                                                    {isSecondaryLoading && <p className="text-[10px] text-primary font-bold animate-pulse text-center">İkinci Kitap Hazırlanıyor...</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-8 border-t border-border/10 space-y-6">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">İşaretler & Notlar</h3>
                                            <div className="space-y-3">
                                                {[...(allBookmarks[book.id] || []), ...(allAnnotations[book.id] || [])].length > 0 ? (
                                                    [...(allBookmarks[book.id] || []), ...(allAnnotations[book.id] || [])]
                                                        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                                                        .map((item: any) => (
                                                            <div key={item.id} className="p-4 rounded-3xl bg-secondary/20 border border-border/10 group relative hover:bg-secondary/40 transition-all">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">{item.type || 'SAYFA'}</span>
                                                                    <button onClick={() => item.type ? useBookStore.getState().removeAnnotation(book.id, item.id) : useBookStore.getState().removeBookmark(book.id, item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all">&times;</button>
                                                                </div>
                                                                <p className="text-xs font-serif italic line-clamp-2 opacity-80 leading-relaxed">"{item.text || item.note || 'Önemli kısım'}"</p>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="py-10 text-center border-2 border-dashed border-border/10 rounded-[2rem] text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Kayıt Bulunmuyor</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>

                            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all">
                                <ArrowLeft className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </header>
            </div>

            {/* Reader Content Area */}
            <div className="flex-1 px-4 md:px-12 lg:px-24 pb-24 overflow-hidden relative group/reader bg-transparent">
                {/* Side Navigation Overlays */}
                <button
                    onClick={() => readerRef.current?.prev()}
                    className="absolute left-6 top-1/2 -translate-y-1/2 h-40 w-16 flex items-center justify-center rounded-full bg-background/20 backdrop-blur-3xl border border-white/10 opacity-0 group-hover/reader:opacity-100 transition-all hover:bg-primary hover:text-white z-50 shadow-2xl hover:scale-105 active:scale-95"
                    title="Önceki Sayfa"
                >
                    <ChevronLeft className="h-10 w-10" />
                </button>

                <button
                    onClick={() => readerRef.current?.next()}
                    className="absolute right-6 top-1/2 -translate-y-1/2 h-40 w-16 flex items-center justify-center rounded-full bg-background/20 backdrop-blur-3xl border border-white/10 opacity-0 group-hover/reader:opacity-100 transition-all hover:bg-primary hover:text-white z-50 shadow-2xl hover:scale-105 active:scale-95"
                    title="Sonraki Sayfa"
                >
                    <ChevronRight className="h-10 w-10" />
                </button>

                <ReaderContainer
                    ref={readerRef}
                    book={book}
                    data={bookData}
                    pageNumber={book.progress?.page || 1}
                    secondaryBook={secondaryBook}
                    secondaryData={secondaryBookData}
                    onLocationChange={handleLocationChange}
                    onTotalPages={setTotalPages}
                    onTextSelected={(cfi: string, text: string) => setSelection({ cfi, text })}
                    annotations={allAnnotations[book.id] || []}
                />
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
                <div className="w-full max-w-xl px-10 py-5 bg-background/30 backdrop-blur-3xl border border-white/5 rounded-full flex items-center gap-8 shadow-2xl pointer-events-auto hover:bg-background/50 transition-all group/progress">
                    <span className="text-[11px] font-black tabular-nums tracking-tighter text-muted-foreground w-12 text-right group-hover/progress:text-primary transition-colors">
                        %{book.progress?.percentage.toFixed(0)}
                    </span>
                    <div className="flex-1 relative h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_15px_rgba(255,157,66,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${book.progress?.percentage || 0}%` }}
                            transition={{ type: 'spring', stiffness: 50 }}
                        />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap group-hover/progress:text-primary transition-colors">
                        SAYFA {book.progress?.page || 1}
                    </span>
                </div>
            </div>

            {/* Selection Toolbar */}
            <AnimatePresence>
                {selection && (
                    <motion.div
                        initial={{ y: 20, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 10, x: '-50%', opacity: 0 }}
                        className="fixed bottom-32 left-1/2 bg-zinc-900/90 border border-white/10 text-white p-2 rounded-3xl shadow-2xl flex items-center gap-1 z-[100] backdrop-blur-3xl"
                    >
                        <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
                            {['#FF9D42', '#7C3AED', '#3B82F6', '#10B981'].map(color => (
                                <button
                                    key={color}
                                    className="h-7 w-7 rounded-full border border-white/20 transition-transform hover:scale-125 hover:z-10 shadow-lg"
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        useBookStore.getState().addAnnotation(book.id, { cfiRange: selection.cfi, text: selection.text, color, type: 'highlight' });
                                        setSelection(null);
                                        toast.success("Bölüm işaretlendi");
                                    }}
                                />
                            ))}
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-2xl hover:bg-white/10 text-[10px] font-black uppercase tracking-widest h-10 px-4" onClick={() => {
                            const note = prompt("Düşüncelerinizi ekleyin:");
                            if (note) {
                                useBookStore.getState().addAnnotation(book.id, { cfiRange: selection.cfi, text: selection.text, note, color: '#FF9D42', type: 'note' });
                                setSelection(null);
                                toast.success("Not kaydedildi");
                            }
                        }}>NOT EKLE</Button>
                        <Separator orientation="vertical" className="h-4 bg-white/10 mx-2" />
                        <button className="h-9 w-9 flex items-center justify-center text-white/40 hover:text-white transition-colors text-2xl" onClick={() => setSelection(null)}>&times;</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

