
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/useStore';
import { Book, getBook, updateProgress, getBooks } from '@/lib/mock-api';
import ReaderContainer from '@/components/reader/ReaderContainer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Settings, ArrowLeft, BookOpen, Columns, Maximize, ChevronDown, BookmarkPlus, ArrowRight, ChevronLeft, ChevronRight, Minimize, ZoomIn, ZoomOut, Loader2, AlertCircle, PenTool, Highlighter, Eraser, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils';
import { useSwipeable } from 'react-swipeable';

// Gelişmiş Çizim Canvas Bileşeni (Sayfa Bazlı Kayıtlı)
const DrawingCanvas = ({ active, tool, pageKey, savedData, onSave }: { active: boolean, tool: 'pen' | 'marker' | 'eraser', pageKey: string, savedData?: string, onSave: (data: string) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Sayfa değiştiğinde veya savedData değiştiğinde canvas'ı geri yükle
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Boyutlandırma
        canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;

        // Context ayarları (Geri yükleme öncesi)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Temizle (Eski sayfanın çizimi silinmeli)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Önceki çizimi yükle
        if (savedData) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = savedData;
        }
    }, [pageKey, savedData]);

    // Tool ayarları
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        if (tool === 'pen') {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'marker') {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 15;
            ctx.globalCompositeOperation = 'multiply';
        } else if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20;
        }
    }, [tool]);

    const saveDrawing = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL());
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!active) return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !active) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveDrawing(); // Çizim bittiğinde kaydet
        }
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-50 touch-none ${active ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
        />
    );
};

const ReaderPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { settings, setSettings, addAnnotation, annotations: storeAnnotations } = useBookStore();

    // Main Book State
    const [book, setBook] = useState<Book | null>(null);
    const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBookSelectOpen, setIsBookSelectOpen] = useState(false);

    // Split Screen & Navigation State
    const [activePanel, setActivePanel] = useState<'primary' | 'secondary'>('primary');
    const readerRef = useRef<any>(null); // Ref to ReaderContainer

    // Tools
    const [activeTool, setActiveTool] = useState<'cursor' | 'pen' | 'marker' | 'eraser'>('cursor');
    const [drawings, setDrawings] = useState<{ [key: string]: string }>({}); // pageKey -> dataURL

    // Secondary Book State
    const { secondaryBookId, setSecondaryBookId } = useBookStore();
    const [secondaryBook, setSecondaryBook] = useState<Book | null>(null);
    const [secondaryBookData, setSecondaryBookData] = useState<string | ArrayBuffer | null>(null);
    const [isSecondaryLoading, setIsSecondaryLoading] = useState(false);
    const [books, setBooks] = useState<Book[]>([]);

    const [selection, setSelection] = useState<{ cfi: string; text: string } | null>(null);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [scale, setScale] = useState(1.0);

    // Initial Load
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
                    reader.onload = (e) => { setBookData(e.target?.result as ArrayBuffer); setLoading(false); };
                    reader.readAsArrayBuffer(blob);
                } else { setBookData(bookInfo.file_url); setLoading(false); }
                const allBooks = await getBooks();
                setBooks(allBooks);
            } catch (err: any) { setError(err.message); setLoading(false); }
        };
        loadContent();
    }, [id]);

    // Secondary Book Load
    useEffect(() => {
        if (settings.readingMode === 'split' && secondaryBookId) {
            const loadSecondary = async () => {
                setIsSecondaryLoading(true);
                try {
                    const b = await getBook(secondaryBookId);
                    if (b) {
                        setSecondaryBook(b); // State'i güncelle
                        // Eğer ikincil kitabın progress bilgisi yoksa varsayılan ekle
                        if (!b.progress) b.progress = { percentage: 0, page: 1, location: '0' };

                        const res = await fetch(b.file_url);
                        const blob = await res.blob();
                        if (b.file_url.endsWith('.epub')) {
                            const reader = new FileReader();
                            reader.onload = (e) => setSecondaryBookData(e.target?.result as ArrayBuffer);
                            reader.readAsArrayBuffer(blob);
                        } else { setSecondaryBookData(b.file_url); }
                    }
                } catch (e) { console.error("Secondary book load failed", e); } finally { setIsSecondaryLoading(false); }
            };
            loadSecondary();
        } else { setSecondaryBook(null); setSecondaryBookData(null); }
    }, [settings.readingMode, secondaryBookId]);

    // Primary Location Change
    const handleLocationChange = (loc: string, percentage: number) => {
        if (!book) return;
        const pageNum = parseInt(loc);
        let actualPercentage = percentage;
        if (!isNaN(pageNum) && totalPages > 0) actualPercentage = (pageNum / totalPages) * 100;

        const newProgress = { ...book.progress, percentage: actualPercentage, location: loc, page: !isNaN(pageNum) ? pageNum : (book.progress?.page || 1) };
        updateProgress(book.id, newProgress);
        setBook(prev => prev ? { ...prev, progress: newProgress } : null);
    };

    // Secondary Location Change
    const handleSecondaryLocationChange = (loc: string, percentage: number) => {
        if (!secondaryBook) return;
        const pageNum = parseInt(loc);
        const newProgress = { ...secondaryBook.progress, location: loc, page: !isNaN(pageNum) ? pageNum : (secondaryBook.progress?.page || 1) };

        // State update for UI
        setSecondaryBook(prev => prev ? { ...prev, progress: newProgress } : null);
    };

    // Navigation Logic
    const nextPage = React.useCallback(() => {
        console.log("Next Page Triggered. Active Panel:", activePanel);
        if (activePanel === 'primary') {
            if (!book) return;
            if (book.format === 'epub') readerRef.current?.next();
            else {
                const currentPage = book.progress?.page || 1;
                const nextP = Math.min(currentPage + 1, totalPages || 9999);
                handleLocationChange(String(nextP), 0);
            }
        } else {
            // Secondary Book Navigation
            if (!secondaryBook) return;
            if (secondaryBook.format === 'pdf') {
                // PDF ref handling for split screen happens inside SplitScreenReader if it uses the passed ref correctly.
                // However, we are controlling page via state.
                const currentPage = secondaryBook.progress?.page || 1;
                const nextP = currentPage + 1;
                handleSecondaryLocationChange(String(nextP), 0);
            } else {
                // EPUB icin imperative handle trigger
                readerRef.current?.next();
            }
        }
    }, [book, secondaryBook, activePanel, totalPages]);

    const prevPage = React.useCallback(() => {
        if (activePanel === 'primary') {
            if (!book) return;
            if (book.format === 'epub') readerRef.current?.prev();
            else {
                const currentPage = book.progress?.page || 1;
                const prevP = Math.max(currentPage - 1, 1);
                handleLocationChange(String(prevP), 0);
            }
        } else {
            if (!secondaryBook) return;
            if (secondaryBook.format === 'pdf') {
                const currentPage = secondaryBook.progress?.page || 1;
                const prevP = Math.max(currentPage - 1, 1);
                handleSecondaryLocationChange(String(prevP), 0);
            } else {
                readerRef.current?.prev();
            }
        }
    }, [book, secondaryBook, activePanel, totalPages]);

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
        if (e.key === ' ') { e.preventDefault(); nextPage(); }
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

    // Drawing Key Logic
    const getCurrentPageKey = () => {
        if (activePanel === 'primary' && book) {
            return `${book.id}-${book.progress?.page || 1}`;
        } else if (activePanel === 'secondary' && secondaryBook) {
            return `${secondaryBook.id}-${secondaryBook.progress?.page || 1}`;
        }
        return 'unknown';
    };

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Kitap Hazırlanıyor...</p>
        </div>
    );

    if (error || !book || !bookData) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-8 text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center"><AlertCircle className="h-10 w-10 text-destructive" /></div>
            <div className="space-y-2"><h2 className="text-2xl font-bold tracking-tight">Bir Sorun Oluştu</h2><p className="text-muted-foreground max-w-md">{error || 'Kitap içeriği yüklenemedi.'}</p></div>
            <Button onClick={() => navigate('/library')} variant="outline" className="rounded-full px-8">Kütüphaneye Dön</Button>
        </div>
    );

    return (
        <div {...swipeHandlers} className={`flex flex-col h-[100dvh] w-full font-serif selection:bg-primary/20 selection:text-primary overflow-hidden transition-colors duration-700 theme-${settings.theme} bg-stone-100 dark:bg-zinc-950 text-foreground relative group/ui overscroll-none`}>

            {/* Drawing Layer with Persistence */}
            <DrawingCanvas
                active={activeTool !== 'cursor'}
                tool={activeTool as any}
                pageKey={getCurrentPageKey()}
                savedData={drawings[getCurrentPageKey()]}
                onSave={(data) => setDrawings(prev => ({ ...prev, [getCurrentPageKey()]: data }))}
            />

            {/* Premium Header */}
            <div className="absolute top-0 left-0 right-0 h-20 z-[90] flex justify-center pt-4 pointer-events-none transition-opacity duration-300 opacity-0 group-hover/ui:opacity-100 focus-within:opacity-100">
                <header className="h-14 px-6 rounded-full bg-background/80 backdrop-blur-xl border border-border/20 shadow-2xl flex items-center justify-between gap-6 pointer-events-auto transition-all duration-500 hover:scale-[1.02] border-primary/10 max-w-[90vw]">
                    <div className="flex items-center gap-4 border-r border-border/10 pr-6">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/library')} className="rounded-full h-9 w-9 hover:bg-primary/10 transition-all">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-col min-w-[100px]">
                            <h1 className="font-sans font-semibold text-sm tracking-tight leading-none mb-1 truncate max-w-[200px] text-foreground/90">{activePanel === 'primary' ? cleanTitle(book.title) : cleanTitle(secondaryBook?.title || '')}</h1>
                            <p className="font-sans text-[10px] font-medium tracking-wide text-muted-foreground/70">{activePanel === 'primary' ? cleanAuthor(book.author) : cleanAuthor(secondaryBook?.author || '')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-secondary/30 rounded-full p-0.5 border border-border/10">
                            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all"><ZoomOut className="h-3.5 w-3.5" /></Button>
                            <span className="text-[10px] font-bold w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.1))} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all"><ZoomIn className="h-3.5 w-3.5" /></Button>
                        </div>
                        <Separator orientation="vertical" className="h-6 mx-1 opacity-20 hidden sm:block" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[240px] h-10 px-4 justify-between border-2 border-primary/20 bg-background/50 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-widest hover:border-primary hover:bg-primary/5 transition-all shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Columns className="h-4 w-4 text-primary" />
                                        <span>
                                            {settings.readingMode === 'single' && 'Tek Sayfa Modu'}
                                            {settings.readingMode === 'double-animated' && 'Çift (Animasyonlu)'}
                                            {settings.readingMode === 'double-static' && 'Çift (Sabit)'}
                                            {settings.readingMode === 'split' && 'Split Screen'}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px] rounded-xl p-2 bg-card/95 backdrop-blur-2xl shadow-2xl border-border/20 z-[100]">
                                {[
                                    { id: 'single', label: 'Tek Sayfa Modu' },
                                    { id: 'double-animated', label: 'Çift Yaprak (Animasyonlu)' },
                                    { id: 'double-static', label: 'Çift Yaprak (Sabit)' },
                                    { id: 'split', label: 'Çift Kitap (Split-Screen)' }
                                ].map(mode => (
                                    <DropdownMenuItem
                                        key={mode.id}
                                        className={`rounded-lg p-3 cursor-pointer text-xs font-bold uppercase tracking-wide mb-1 last:mb-0 transition-colors ${settings.readingMode === mode.id ? 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground' : 'focus:bg-primary/10'}`}
                                        onClick={() => setSettings({ readingMode: mode.id as any })}
                                    >
                                        {mode.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 border-l border-border/10 pl-6">
                        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-full h-9 w-9 hover:bg-primary/10 transition-all hidden sm:flex">
                            {isFullscreen ? <Minimize className="h-4 w-4 text-primary" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-inner"><Settings className="h-4 w-4" /></Button>
                            </SheetTrigger>
                            <SheetContent className="w-[350px] sm:w-[450px] bg-background/95 backdrop-blur-3xl border-l-[12px] border-primary/20 rounded-l-[40px] shadow-[-20px_0_50px_rgba(0,0,0,0.2)]">
                                <SheetHeader className="mb-10 pt-10 px-4">
                                    <div className="h-1 w-20 bg-primary/20 rounded-full mb-8 mx-auto" />
                                    <SheetTitle className="text-3xl font-black italic tracking-tighter flex items-center gap-3">AYARLAR <Settings className="h-6 w-6 text-primary animate-[spin_4s_linear_infinite]" /></SheetTitle>
                                    <SheetDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Okuma Deneyiminizi Kişiselleştirin</SheetDescription>
                                </SheetHeader>
                                <div className="space-y-12 px-4 pb-20 no-scrollbar overflow-y-auto max-h-[70vh]">
                                    <div className="space-y-6">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">Görünüm Teması <div className="flex-1 h-px bg-primary/10" /></h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[{ id: 'light', color: 'bg-white', label: 'AYDINLIK', border: 'border-slate-200' }, { id: 'sepia', color: 'bg-[#f4ecd8]', label: 'ANTİK', border: 'border-[#e4dcc8]' }, { id: 'dark', color: 'bg-slate-950', label: 'KARANLIK', border: 'border-slate-800' }].map(t => (
                                                <button key={t.id} onClick={() => setSettings({ theme: t.id as any })} className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-300 ${settings.theme === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/10 bg-secondary/5 hover:border-border/30 hover:bg-secondary/10'}`}>
                                                    <div className={`h-14 w-14 rounded-full ${t.color} border ${t.border} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                                    {settings.theme === t.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center"><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Metin Boyutu</h3><span className="text-sm font-black tabular-nums bg-primary/10 px-3 py-1 rounded-full text-primary">%{settings.fontSize}</span></div>
                                        <div className="px-2 pt-2"><Slider value={[settings.fontSize]} min={50} max={200} step={10} onValueChange={([v]) => setSettings({ fontSize: v })} className="py-4" /><div className="flex justify-between mt-2 px-1"><span className="text-[9px] font-black opacity-30">EN KÜÇÜK</span><span className="text-[9px] font-black opacity-30">EN BÜYÜK</span></div></div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>
            </div>

            {/* Floating Navigation Buttons (Side) */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 z-[80] hidden md:block transition-opacity duration-300 opacity-0 group-hover/ui:opacity-100 hover:opacity-100">
                <Button variant="outline" size="icon" onClick={prevPage} className="h-14 w-14 rounded-full bg-background/50 backdrop-blur-sm border-border/10 hover:bg-primary hover:text-white shadow-xl transition-all hover:scale-110">
                    <ChevronLeft className="h-8 w-8" />
                </Button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[80] hidden md:block transition-opacity duration-300 opacity-0 group-hover/ui:opacity-100 hover:opacity-100">
                <Button variant="outline" size="icon" onClick={nextPage} className="h-14 w-14 rounded-full bg-background/50 backdrop-blur-sm border-border/10 hover:bg-primary hover:text-white shadow-xl transition-all hover:scale-110">
                    <ChevronRight className="h-8 w-8" />
                </Button>
            </div>

            {/* Creative Toolbar (Moved to Bottom Right) */}
            <div className="absolute right-6 bottom-24 flex flex-col gap-3 z-[90] bg-background/80 backdrop-blur-xl p-2 rounded-full border border-border/20 shadow-2xl transition-transform duration-500 translate-x-32 group-hover/ui:translate-x-0">
                {[
                    { id: 'cursor', icon: MousePointer2, label: 'İmleç' },
                    { id: 'marker', icon: Highlighter, label: 'Vurgula' },
                    { id: 'pen', icon: PenTool, label: 'Kalem' },
                    { id: 'eraser', icon: Eraser, label: 'Silgi' }
                ].map((tool) => (
                    <Button
                        key={tool.id}
                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setActiveTool(tool.id as any)}
                        className={`rounded-full h-10 w-10 transition-all ${activeTool === tool.id ? 'shadow-lg ring-2 ring-primary/20' : 'hover:bg-primary/10'}`}
                        title={tool.label}
                    >
                        <tool.icon className="h-5 w-5" />
                    </Button>
                ))}
            </div>

            {/* Main Reader Container */}
            <main className="flex-1 relative overflow-hidden flex items-center justify-center w-full h-full min-h-0 bg-background/50">
                <div className={`w-full h-full transition-all duration-500 ${isSettingsOpen ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>
                    <ReaderContainer
                        ref={readerRef}
                        book={book}
                        data={bookData}
                        pageNumber={book.progress?.page || 1}

                        secondaryBook={secondaryBook}
                        secondaryData={secondaryBookData}
                        secondaryPageNumber={secondaryBook?.progress?.page || 1}
                        onSecondaryLocationChange={handleSecondaryLocationChange}
                        activePanel={activePanel}
                        onPanelActivate={setActivePanel}

                        onLocationChange={handleLocationChange}
                        onTotalPages={setTotalPages}
                        scale={scale}
                        onTextSelected={(cfi: string, text: string) => setSelection({ cfi, text })}
                        annotations={storeAnnotations[book.id] || []}
                        onOpenSettings={() => setIsBookSelectOpen(true)}
                    />
                </div>
            </main>

            {/* Minimalist Bottom Footer */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-10 px-6 rounded-full bg-background/80 backdrop-blur-xl border border-border/10 shadow-lg flex items-center justify-between gap-6 z-[90] transition-all duration-300 opacity-0 group-hover/ui:opacity-100">
                <span className="text-[10px] font-black text-primary opacity-60">
                    %{Math.round(activePanel === 'primary' ? (book.progress?.percentage || 0) : (secondaryBook?.progress?.percentage || 0))}
                </span>
                <div className="w-32 h-1.5 bg-secondary/30 rounded-full cursor-pointer hover:scale-y-150 transition-all"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = (x / rect.width);
                        const targetPage = Math.max(1, Math.round(pct * totalPages));
                        if (activePanel === 'primary') handleLocationChange(String(targetPage), pct * 100);
                        else handleSecondaryLocationChange(String(targetPage), pct * 100);
                    }}>
                    <div className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${activePanel === 'primary' ? (book.progress?.percentage || 0) : (secondaryBook?.progress?.percentage || 0)}%` }} />
                </div>
                <span className="text-[10px] font-black tabular-nums text-primary">{activePanel === 'primary' ? (book.progress?.page || 1) : (secondaryBook?.progress?.page || 1)}</span>
            </div>

            {/* Book Selection Dialog */}
            <Dialog open={isBookSelectOpen} onOpenChange={setIsBookSelectOpen}>
                <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-2xl border-primary/10 rounded-[32px] p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black italic tracking-tighter">İKİNCİ KİTABI SEÇ</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Karşılaştırmalı okuma için bir kitap belirleyin</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 pt-0 max-h-[60vh] overflow-y-auto">
                        {books.filter(b => b.id !== id).map(b => (
                            <button
                                key={b.id}
                                onClick={() => {
                                    setSecondaryBookId(b.id);
                                    setIsBookSelectOpen(false);
                                    if (settings.readingMode !== 'split') setSettings({ readingMode: 'split' });
                                }}
                                className={`relative group flex flex-col gap-3 p-3 rounded-2xl border transition-all text-left hover:scale-[1.02] active:scale-[0.98] ${secondaryBookId === b.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/10 bg-secondary/10 hover:border-primary/30 hover:bg-secondary/20'}`}
                            >
                                <div className="aspect-[2/3] rounded-xl bg-muted overflow-hidden shadow-md relative">
                                    {b.cover_url ? (
                                        <img src={b.cover_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-secondary p-2 text-center">
                                            <BookOpen className="h-6 w-6 text-primary/40 mb-2" />
                                            <span className="text-[8px] font-bold leading-tight opacity-50 line-clamp-2">{cleanTitle(b.title)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold truncate leading-tight">{cleanTitle(b.title)}</p>
                                    <p className="text-[9px] font-medium text-muted-foreground truncate">{cleanAuthor(b.author)}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <AnimatePresence>
                {selection && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-popover/90 backdrop-blur-xl border border-border/20 p-2 rounded-2xl shadow-2xl flex items-center gap-1"
                    >
                        <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white" onClick={() => { addAnnotation(book.id, { id: Math.random().toString(36).substr(2, 9), cfiRange: selection.cfi, text: selection.text, color: 'yellow', type: 'highlight', createdAt: new Date().toISOString() }); setSelection(null); toast.success("Highlights'a Eklendi"); }}>
                            <BookmarkPlus className="h-3.5 w-3.5 mr-2" /> Vurgula
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => setSelection(null)}><AlertCircle className="h-3.5 w-3.5" /></Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReaderPage;
