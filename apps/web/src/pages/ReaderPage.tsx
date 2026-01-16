import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { Book, getBook, updateProgress, getBooks } from '@/lib/mock-api';
import ReaderContainer from '@/components/reader/ReaderContainer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, ArrowLeft, BookOpen, Columns, Maximize, ChevronDown, BookmarkPlus, ArrowRight, ChevronLeft, ChevronRight, Minimize, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils';
import { useSwipeable } from 'react-swipeable';

const ReaderPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { settings, setSettings, addAnnotation, annotations: storeAnnotations } = useBookStore();
    const [book, setBook] = useState<Book | null>(null);
    const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const readerRef = useRef<any>(null);

    // Split view support
    const { secondaryBookId, setSecondaryBookId } = useBookStore();
    const [secondaryBook, setSecondaryBook] = useState<Book | null>(null);
    const [secondaryBookData, setSecondaryBookData] = useState<string | ArrayBuffer | null>(null);
    const [isSecondaryLoading, setIsSecondaryLoading] = useState(false);
    const [books, setBooks] = useState<Book[]>([]);

    const [selection, setSelection] = useState<{ cfi: string; text: string } | null>(null);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [scale, setScale] = useState(1.0);

    useEffect(() => {
        if (!id) return;

        const loadContent = async () => {
            try {
                setLoading(true);
                setError(null);
                const bookInfo = await getBook(id);
                if (!bookInfo) throw new Error('Kitap bulunamadı');

                setBook(bookInfo);

                if (bookInfo.format === 'epub') {
                    const fileRes = await fetch(bookInfo.file_url);
                    const blob = await fileRes.blob();
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        setBookData(e.target?.result as ArrayBuffer);
                        setLoading(false);
                    };
                    reader.onerror = () => {
                        setError("Dosya okuma hatası.");
                        setLoading(false);
                    };
                    reader.readAsArrayBuffer(blob);
                } else {
                    // PDF ise doğrudan URL'i kullan
                    setBookData(bookInfo.file_url);
                    setLoading(false);
                }

                // İkinci kitap listesini yükle
                const allBooks = await getBooks();
                setBooks(allBooks);
            } catch (err: any) {
                console.error("Yükleme hatası:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadContent();
    }, [id]);

    useEffect(() => {
        if (settings.readingMode === 'split' && secondaryBookId) {
            const loadSecondary = async () => {
                setIsSecondaryLoading(true);
                try {
                    const b = await getBook(secondaryBookId);
                    if (b) {
                        setSecondaryBook(b);
                        const res = await fetch(b.file_url);
                        const blob = await res.blob();
                        if (b.file_url.endsWith('.epub')) {
                            const reader = new FileReader();
                            reader.onload = (e) => setSecondaryBookData(e.target?.result as ArrayBuffer);
                            reader.readAsArrayBuffer(blob);
                        } else {
                            setSecondaryBookData(b.file_url);
                        }
                    }
                } catch (e) {
                    console.error("Secondary book load failed", e);
                } finally {
                    setIsSecondaryLoading(false);
                }
            };
            loadSecondary();
        } else {
            setSecondaryBook(null);
            setSecondaryBookData(null);
        }
    }, [settings.readingMode, secondaryBookId]);

    const handleLocationChange = (loc: string, percentage: number) => {
        if (!book) return;
        const pageNum = parseInt(loc);
        let actualPercentage = percentage;

        if (!isNaN(pageNum) && totalPages > 0) {
            actualPercentage = (pageNum / totalPages) * 100;
        }

        const newProgress = {
            ...book.progress,
            percentage: actualPercentage,
            location: loc,
            page: !isNaN(pageNum) ? pageNum : (book.progress?.page || 1)
        };

        // 1. API Güncelle
        updateProgress(book.id, newProgress);

        // 2. Local State Güncelle (UI render için şart!)
        setBook(prev => prev ? { ...prev, progress: newProgress } : null);
    };

    // Navigation Helpers
    const nextPage = React.useCallback(() => {
        if (!book) return;
        if (book.format === 'epub') {
            readerRef.current?.next();
        } else {
            const currentPage = book.progress?.page || 1;
            const nextP = Math.min(currentPage + 1, totalPages || 9999);
            handleLocationChange(String(nextP), 0);
        }
    }, [book, totalPages]);

    const prevPage = React.useCallback(() => {
        if (!book) return;
        if (book.format === 'epub') {
            readerRef.current?.prev();
        } else {
            const currentPage = book.progress?.page || 1;
            const prevP = Math.max(currentPage - 1, 1);
            handleLocationChange(String(prevP), 0);
        }
    }, [book, totalPages]);

    // Swipe handlers
    const swipeHandlers = useSwipeable({
        onSwipedLeft: nextPage,
        onSwipedRight: prevPage,
        preventScrollOnSwipe: true,
        trackMouse: false
    });

    const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
        if (!book) return;
        if (e.key === 'ArrowRight') nextPage();
        if (e.key === 'ArrowLeft') prevPage();
        // Also support Space for next page
        if (e.key === ' ') {
            e.preventDefault();
            nextPage();
        }
    }, [nextPage, prevPage, book]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Kitap Hazırlanıyor...</p>
        </div>
    );

    if (error || !book || !bookData) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-8 text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Bir Sorun Oluştu</h2>
                <p className="text-muted-foreground max-w-md">{error || 'Kitap içeriği yüklenemedi.'}</p>
            </div>
            <Button onClick={() => navigate('/library')} variant="outline" className="rounded-full px-8">Kütüphaneye Dön</Button>
        </div>
    );

    return (
        <div {...swipeHandlers} className={`flex flex-col h-screen w-full font-serif selection:bg-primary/20 selection:text-primary overflow-hidden transition-colors duration-700 theme-${settings.theme} bg-background text-foreground relative`}>

            {/* Premium Header - ALWAYS VISIBLE */}
            <div className="absolute top-0 left-0 right-0 h-20 z-[100] flex justify-center pt-4 pointer-events-none">
                <header className="h-14 px-6 rounded-full bg-background/90 backdrop-blur-2xl border border-border/20 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto transition-all duration-500 hover:scale-[1.02] border-primary/10 max-w-[95vw]">

                    {/* Left: Back & Nav */}
                    <div className="flex items-center gap-2 border-r border-border/10 pr-6">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/library')} className="rounded-full h-9 w-9 hover:bg-primary/10 transition-all">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={prevPage} className="rounded-full h-9 w-9 hover:bg-primary/10 transition-all" title="Önceki Sayfa">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col min-w-[80px] hidden sm:flex">
                            <h1 className="font-sans font-semibold text-sm tracking-tight leading-none mb-1 truncate max-w-[150px] text-foreground/90">{cleanTitle(book.title)}</h1>
                            <p className="font-sans text-[10px] font-medium tracking-wide text-muted-foreground/70">{cleanAuthor(book.author)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-secondary/30 rounded-full p-0.5 border border-border/10">
                            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all">
                                <ZoomOut className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-[10px] font-bold w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.1))} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all">
                                <ZoomIn className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-1 opacity-20 hidden sm:block" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full px-4 h-9 border border-primary/20 bg-primary/5 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm hidden sm:flex">
                                    <Columns className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    {settings.readingMode === 'single' ? 'TEK' : 'ÇİFT'}
                                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-[200px] rounded-2xl p-2 bg-card/95 backdrop-blur-2xl shadow-2xl border-border/20">
                                {[
                                    { id: 'single', label: 'Tek Sayfa (Klasik)' },
                                    { id: 'double-animated', label: 'Çift Sayfa (Mekanik)' },
                                    { id: 'double-static', label: 'Çift Sayfa (Sabit)' },
                                    { id: 'split', label: 'Split Screen (İki Kitap)' }
                                ].map(mode => (
                                    <DropdownMenuItem key={mode.id} className={`rounded-xl p-3 cursor-pointer text-[11px] font-bold uppercase tracking-wider mb-1 last:mb-0 ${settings.readingMode === mode.id ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setSettings({ readingMode: mode.id as any })}>
                                        {mode.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Right: Next & Settings */}
                    <div className="flex items-center gap-2 border-l border-border/10 pl-6">
                        <Button variant="ghost" size="icon" onClick={nextPage} className="rounded-full h-9 w-9 hover:bg-primary/10 transition-all" title="Sonraki Sayfa">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-full h-9 w-9 hover:bg-primary/10 transition-all hidden sm:flex">
                            {isFullscreen ? <Minimize className="h-4 w-4 text-primary" /> : <Maximize className="h-4 w-4" />}
                        </Button>

                        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-inner">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[350px] sm:w-[450px] bg-background/95 backdrop-blur-3xl border-l-[12px] border-primary/20 rounded-l-[40px] shadow-[-20px_0_50px_rgba(0,0,0,0.2)]">
                                <SheetHeader className="mb-10 pt-10 px-4">
                                    <div className="h-1 w-20 bg-primary/20 rounded-full mb-8 mx-auto" />
                                    <SheetTitle className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                                        AYARLAR <Settings className="h-6 w-6 text-primary animate-[spin_4s_linear_infinite]" />
                                    </SheetTitle>
                                    <SheetDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Okuma Deneyiminizi Kişiselleştirin</SheetDescription>
                                </SheetHeader>

                                <div className="space-y-12 px-4 pb-20 no-scrollbar overflow-y-auto max-h-[70vh]">
                                    {/* Theme Selection */}
                                    <div className="space-y-6">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">Görünüm Teması <div className="flex-1 h-px bg-primary/10" /></h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'light', color: 'bg-white', label: 'AYDINLIK', border: 'border-slate-200' },
                                                { id: 'sepia', color: 'bg-[#f4ecd8]', label: 'ANTİK', border: 'border-[#e4dcc8]' },
                                                { id: 'dark', color: 'bg-slate-950', label: 'KARANLIK', border: 'border-slate-800' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setSettings({ theme: t.id as any })}
                                                    className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-300 ${settings.theme === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/10 bg-secondary/5 hover:border-border/30 hover:bg-secondary/10'}`}
                                                >
                                                    <div className={`h-14 w-14 rounded-full ${t.color} border ${t.border} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                                    {settings.theme === t.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Font Size */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Metin Boyutu</h3>
                                            <span className="text-sm font-black tabular-nums bg-primary/10 px-3 py-1 rounded-full text-primary">%{settings.fontSize}</span>
                                        </div>
                                        <div className="px-2 pt-2">
                                            <Slider
                                                value={[settings.fontSize]}
                                                min={50}
                                                max={200}
                                                step={10}
                                                onValueChange={([v]) => setSettings({ fontSize: v })}
                                                className="py-4"
                                            />
                                            <div className="flex justify-between mt-2 px-1">
                                                <span className="text-[9px] font-black opacity-30">EN KÜÇÜK</span>
                                                <span className="text-[9px] font-black opacity-30">EN BÜYÜK</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Split Screen Settings */}
                                    {settings.readingMode === 'split' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">Karşılaştırmalı Kitap <div className="flex-1 h-px bg-primary/10" /></h3>
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
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>
            </div>

            {/* Main Reader Container */}
            <main className="flex-1 relative overflow-hidden flex items-center justify-center pt-24 pb-20">
                <ReaderContainer
                    ref={readerRef}
                    book={book}
                    data={bookData}
                    pageNumber={book.progress?.page || 1}
                    secondaryBook={secondaryBook}
                    secondaryData={secondaryBookData}
                    onLocationChange={handleLocationChange}
                    onTotalPages={setTotalPages}
                    scale={scale}
                    onTextSelected={(cfi: string, text: string) => setSelection({ cfi, text })}
                    annotations={storeAnnotations[book.id] || []}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />
            </main>

            {/* Minimalist Bottom Footer */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 h-12 px-6 rounded-full bg-background/80 backdrop-blur-xl border border-border/10 shadow-xl flex items-center justify-between gap-8 z-[100] group/footer hover:w-[450px] transition-all duration-500 overflow-hidden border-primary/5">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary opacity-60">%{Math.round(book.progress?.percentage || 0)}</span>
                    <div className="w-24 h-4 flex items-center group-hover/footer:w-48 transition-all duration-500 cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const pct = (x / rect.width);
                            const targetPage = Math.max(1, Math.round(pct * totalPages));
                            handleLocationChange(String(targetPage), pct * 100);
                        }}>
                        <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden relative">
                            <div className="h-full bg-primary rounded-full absolute top-0 left-0" style={{ width: `${book.progress?.percentage || 0}%` }} />
                        </div>
                    </div>
                </div>

                <div className="h-4 w-px bg-border/20" />

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SAYFA</span>
                    <span className="text-xs font-black tabular-nums text-primary">{book.progress?.page || 1} / {totalPages || '?'}</span>
                </div>
            </div>

            {/* Text Selection Menu */}
            <AnimatePresence>
                {selection && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-popover/90 backdrop-blur-xl border border-border/20 p-2 rounded-2xl shadow-2xl flex items-center gap-1"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white"
                            onClick={() => {
                                addAnnotation(book.id, {
                                    id: Math.random().toString(36).substr(2, 9),
                                    cfiRange: selection.cfi,
                                    text: selection.text,
                                    color: 'yellow',
                                    type: 'highlight',
                                    createdAt: new Date().toISOString()
                                });
                                setSelection(null);
                                toast.success("Not Deftere Eklendi");
                            }}
                        >
                            <BookmarkPlus className="h-3.5 w-3.5 mr-2" /> Vurgula
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => setSelection(null)}>
                            <AlertCircle className="h-3.5 w-3.5" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReaderPage;
