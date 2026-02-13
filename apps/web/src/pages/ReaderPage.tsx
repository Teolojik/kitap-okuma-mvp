
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/useStore';
import { Book, getBook, getBooks } from '@/lib/mock-api';
import ReaderContainer from '@/components/reader/ReaderContainer';
import TTSController from '@/components/reader/TTSController';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Settings, ArrowLeft, BookOpen, Columns, Maximize, ChevronDown, BookmarkPlus, ArrowRight, ChevronLeft, ChevronRight, Minimize, ZoomIn, ZoomOut, Loader2, AlertCircle, PenTool, Highlighter, Eraser, MousePointer2, StickyNote, Palette, Sliders, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils';
import { useSwipeable } from 'react-swipeable';
import SelectionToolbar from '@/components/reader/SelectionToolbar';
import QuoteModal from '@/components/reader/QuoteModal';

import AIAssistant from '@/components/reader/AIAssistant';
import NotesSidebar from '@/components/reader/NotesSidebar';
import { useTranslation } from '@/lib/translations';

// Gelişmiş Çizim Canvas Bileşeni (Sayfa Bazlı Kayıtlı)
const DrawingCanvas = ({ active, tool, pageKey, savedData, onSave, settings }: {
    active: boolean,
    tool: 'pen' | 'marker' | 'eraser',
    pageKey: string,
    savedData?: string,
    onSave: (data: string) => void,
    settings: { color: string, width: number, opacity: number }
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPosRef = useRef<{ x: number, y: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Canvas resize logic
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const parent = canvas.parentElement;
            if (parent) {
                const oldData = canvas.toDataURL();
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = oldData;
                }
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load saved data for specific page
    const loadedPageKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Only clear and reload if the page has changed
        if (loadedPageKeyRef.current !== pageKey) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            loadedPageKeyRef.current = pageKey;

            if (savedData) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = savedData;
            }
        }
    }, [pageKey, savedData]);

    // Apply tools settings
    const setupContext = (ctx: CanvasRenderingContext2D) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (tool === 'pen') {
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = settings.width;
            ctx.globalAlpha = settings.opacity;
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'marker') {
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = settings.width * 6;
            ctx.globalAlpha = 0.4; // Very light alpha for marker
            ctx.globalCompositeOperation = 'source-over'; // Let CSS blend mode handle the mixing
        } else if (tool === 'eraser') {
            ctx.strokeStyle = '#000000';
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = settings.width * 8;
            ctx.globalAlpha = 1;
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        lastPosRef.current = { x: clientX - rect.left, y: clientY - rect.top };
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !active || !lastPosRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        setupContext(ctx);
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        lastPosRef.current = { x: currentX, y: currentY };
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const canvas = canvasRef.current;
            if (canvas) onSave(canvas.toDataURL());
            lastPosRef.current = null;
        }
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 touch-none ${active ? 'z-[110] pointer-events-auto cursor-crosshair' : 'z-40 pointer-events-none'}`}
            style={{
                mixBlendMode: 'multiply',
                opacity: 1
            }}
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
    const {
        settings,
        setSettings,
        addAnnotation,
        removeAnnotation,
        annotations: storeAnnotations,
        updateStats,
        drawings,
        saveDrawing,
        updateProgress,
        touchLastRead,
        fetchDrawingsForBook,
        books,
        fetchBooks
    } = useBookStore();
    const t = useTranslation(settings.language);

    // Main Book State
    const [book, setBook] = useState<Book | null>(null);
    const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Okuma Süresi Takibi (Her 10 saniyede bir)
    useEffect(() => {
        if (loading || !book) return;
        const interval = setInterval(() => {
            if (book?.id) updateStats(0, book.id, 10);
        }, 10000);
        return () => clearInterval(interval);
    }, [loading, book?.id, updateStats]);

    // --- UI & Navigation States ---
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBookSelectOpen, setIsBookSelectOpen] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [isUIVisible, setIsUIVisible] = useState(true);
    const [activePanel, setActivePanel] = useState<'primary' | 'secondary'>('primary');
    const [pageDirection, setPageDirection] = useState(1);

    // --- Book & Content States ---
    const { secondaryBookId, setSecondaryBookId } = useBookStore();
    const [secondaryBook, setSecondaryBook] = useState<Book | null>(null);
    const [secondaryBookData, setSecondaryBookData] = useState<string | ArrayBuffer | null>(null);
    const [isSecondaryLoading, setIsSecondaryLoading] = useState(false);
    const [selection, setSelection] = useState<{ cfi: string; text: string } | null>(null);
    const handleTextSelected = React.useCallback((cfi: string, text: string) => {
        setSelection({ cfi, text });
    }, []);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [secondaryTotalPages, setSecondaryTotalPages] = useState<number>(0);
    const [scale, setScale] = useState(1.0);
    const [currentLocation, setCurrentLocation] = useState<string>('0');
    const [currentPercentage, setCurrentPercentage] = useState<number>(0);
    const [jumpPage, setJumpPage] = useState<string>('1');
    const [noteDraft, setNoteDraft] = useState('');

    // --- Search States ---
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('reader_search_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    // --- Tools & Settings ---
    const [activeTool, setActiveTool] = useState<'cursor' | 'pen' | 'marker' | 'eraser'>('cursor');
    const [toolSettings, setToolSettings] = useState({
        color: '#f97316',
        width: 3,
        opacity: 1
    });

    // --- Refs ---
    const readerRef = useRef<any>(null);
    const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const prevPageRef = useRef<number>(1);

    // --- Effects & Handlers ---
    useEffect(() => {
        const p = activePanel === 'primary' ? (book?.progress?.page || 1) : (secondaryBook?.progress?.page || 1);
        setJumpPage(String(p));
    }, [book?.progress?.page, secondaryBook?.progress?.page, activePanel]);

    const handleSearch = async (queryParam?: string | React.MouseEvent) => {
        let q = searchQuery.trim();
        if (typeof queryParam === 'string') {
            q = queryParam.trim();
            setSearchQuery(q);
        } else if (queryParam && 'preventDefault' in queryParam) {
            queryParam.preventDefault();
        }

        if (!q || !readerRef.current) return;

        setIsSearching(true);
        try {
            const results = await readerRef.current.search(q, useRegex);
            setSearchResults(results);

            // Add to history if unique
            if (!searchHistory.includes(q)) {
                const newHistory = [q, ...searchHistory.slice(0, 4)];
                setSearchHistory(newHistory);
                localStorage.setItem('reader_search_history', JSON.stringify(newHistory));
            }
        } catch (e) {
            console.error("Search failed", e);
            toast.error(t('searchFailed'));
        } finally {
            setIsSearching(false);
        }
    };

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('reader_search_history');
    };

    const highlightText = (text: string, term: string) => {
        if (!term) return text;
        try {
            const regex = useRegex ? new RegExp(`(${term})`, 'gi') : new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = text.split(regex);
            return parts.map((part, i) =>
                regex.test(part) ? <mark key={i} className="bg-primary/30 text-primary font-bold rounded-sm px-0.5">{part}</mark> : part
            );
        } catch (e) { return text; }
    };

    const jumpToSearchResult = (cfi: string) => {
        if (readerRef.current) {
            if (book?.format === 'epub') {
                readerRef.current.goTo(cfi);
            } else {
                handleLocationChange(cfi, (parseInt(cfi) / totalPages) * 100);
            }
            setIsSearchOpen(false);
        }
    };

    useEffect(() => {
        const currentPage = book?.progress?.page || 1;
        if (currentPage !== prevPageRef.current) {
            setPageDirection(currentPage > prevPageRef.current ? 1 : -1);
            prevPageRef.current = currentPage;
        }
    }, [book?.progress?.page]);

    useEffect(() => {
        const handleMouseMove = () => {
            if (!isUIVisible) setIsUIVisible(true);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            uiTimeoutRef.current = setTimeout(() => {
                setIsUIVisible(false);
            }, 3000);
        };

        const handleGlobalClick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('button, [role="menuitem"], .no-zen-toggle, input, select, textarea')) return;

            setIsUIVisible(prev => {
                const next = !prev;
                if (next) {
                    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
                    uiTimeoutRef.current = setTimeout(() => {
                        setIsUIVisible(false);
                    }, 3000);
                }
                return next;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleGlobalClick);

        // Initial hide timer
        uiTimeoutRef.current = setTimeout(() => {
            setIsUIVisible(false);
        }, 3000);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleGlobalClick);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        };
    }, [isUIVisible]);

    // Initial Load
    useEffect(() => {
        if (!id) return;
        const loadContent = async () => {
            try {
                setLoading(true);
                setError(null);
                const bookInfo = await getBook(id);
                if (!bookInfo) throw new Error(t('bookNotFound'));

                setBook(bookInfo);

                // Update last read timestamp immediately without risking progress overwrite
                touchLastRead(bookInfo.id);

                if (bookInfo.format === 'epub') {
                    const fileRes = await fetch(bookInfo.file_url);
                    const blob = await fileRes.blob();
                    const reader = new FileReader();
                    reader.onload = (e) => { setBookData(e.target?.result as ArrayBuffer); setLoading(false); };
                    reader.readAsArrayBuffer(blob);
                } else { setBookData(bookInfo.file_url); setLoading(false); }

                // Fetch books to store if empty
                if (books.length === 0) {
                    await fetchBooks();
                }

                // PERFORMANCE: Fetch drawings only for the active book
                fetchDrawingsForBook(bookInfo.id);
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
                        setSecondaryBook(b);
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

    // Sync state with book load
    useEffect(() => {
        if (book && book.progress) {
            const initialLoc = book.progress.location || String(book.progress.page || 1);
            setCurrentLocation(String(initialLoc));
            setCurrentPercentage(book.progress.percentage || 0);
        }
    }, [book]);

    // Primary Location Change
    const handleLocationChange = (loc: string, percentage: number) => {
        if (!book || loading) return;

        // Determine if this is a CFI (EPUB) or page number (PDF)
        const isCfi = loc.startsWith('epubcfi(');

        let pageNum = 1;
        if (isCfi) {
            // For EPUB: estimate page from percentage
            pageNum = totalPages > 0
                ? Math.max(1, Math.round((percentage / 100) * totalPages))
                : Math.max(1, Math.ceil(percentage / 2)); // Rough estimate: 2% per page
        } else {
            // For PDF: parse the page number directly
            pageNum = parseInt(loc) || 1;
        }

        // Anti-reset guard: Don't reset to page 1 if user was further along
        const currentSavedPage = book.progress?.page || 1;
        if (pageNum === 1 && currentSavedPage > 1 && percentage < 2) {
            console.log('Progress: Anti-reset guard triggered, ignoring page 1 reset');
            return;
        }

        // Skip if no significant change
        const prevPercentage = book.progress?.percentage || 0;
        if (book.progress?.location === loc && Math.abs(prevPercentage - percentage) < 0.5) {
            return;
        }

        // Calculate actual percentage based on format
        let actualPercentage = percentage;
        if (!isCfi && totalPages > 0) {
            // For PDF, calculate percentage from page number
            actualPercentage = (pageNum / totalPages) * 100;
        }

        // Update reading stats
        const prevPage = book.progress?.page || 0;
        if (pageNum > prevPage) {
            updateStats(pageNum - prevPage, book.id, 0);
        }

        // Save progress with CFI location for EPUB
        const newProgress = {
            ...book.progress,
            percentage: actualPercentage,
            location: loc, // This will be CFI for EPUB, page number for PDF
            page: pageNum
        };

        console.log('Progress: Saving', {
            format: isCfi ? 'EPUB' : 'PDF',
            page: pageNum,
            percentage: actualPercentage.toFixed(2),
            locationPreview: loc.substring(0, 40) + '...'
        });

        updateProgress(book.id, newProgress);
        setBook(prev => prev ? { ...prev, progress: newProgress } : null);
    };

    const handleSecondaryLocationChange = (loc: string, percentage: number) => {
        if (!secondaryBook) return;

        let pageNum = parseInt(loc);
        if (isNaN(pageNum) && secondaryTotalPages > 0) {
            pageNum = Math.round((percentage / 100) * secondaryTotalPages) || 1;
        }

        if (secondaryBook.progress?.location === loc && Math.abs((secondaryBook.progress?.percentage || 0) - percentage) < 0.1) return;

        const newProgress = { ...secondaryBook.progress, location: loc, page: pageNum || 1, percentage: percentage };
        updateProgress(secondaryBook.id, newProgress);
        setSecondaryBook(prev => prev ? { ...prev, progress: newProgress } : null);
    };

    // Navigation Logic
    const nextPage = React.useCallback(() => {
        if (readerRef.current?.next) {
            readerRef.current.next();
        }
    }, [activePanel]);

    const prevPage = React.useCallback(() => {
        if (readerRef.current?.prev) {
            readerRef.current.prev();
        }
    }, [activePanel]);

    const swipeHandlers = useSwipeable({
        onSwipedLeft: nextPage,
        onSwipedRight: prevPage,
        preventScrollOnSwipe: true,
        trackMouse: false
    });

    const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        // Disable shortcuts if typing in ANY input or textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (e.key === 'ArrowRight') nextPage();
        if (e.key === 'ArrowLeft') prevPage();
        if (e.key === ' ') {
            e.preventDefault();
            nextPage();
        }
    }, [nextPage, prevPage]);

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
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">{t('loadingBook')}</p>
        </div>
    );

    if (error || !book || !bookData) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-8 text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center"><AlertCircle className="h-10 w-10 text-destructive" /></div>
            <div className="space-y-2"><h2 className="text-2xl font-bold tracking-tight">{t('somethingWentWrong')}</h2><p className="text-muted-foreground max-w-md">{error || t('bookLoadError')}</p></div>
            <Button onClick={() => navigate('/library')} variant="outline" className="rounded-full px-8">{t('backToLibrary')}</Button>
        </div>
    );

    return (
        <div {...swipeHandlers} className={`flex flex-col w-full h-full font-serif  overflow-hidden transition-colors duration-700 theme-${settings.theme} bg-background text-foreground relative group/ui overscroll-none`}>

            {/* Premium Header - Zen Mode Controlled */}
            <div className={`absolute top-0 left-0 right-0 z-[90] flex justify-center pt-3 sm:pt-6 pointer-events-none transition-all duration-700 ${isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                {/* Mobile Header - Simplified */}
                <header className="sm:hidden h-12 px-4 mx-3 rounded-full bg-background/80 backdrop-blur-2xl border border-white/20 shadow-lg flex items-center justify-between gap-2 pointer-events-auto w-full max-w-[95vw]">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/library')} className="rounded-full h-9 w-9 text-primary">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 text-center overflow-hidden px-2">
                        <h1 className="font-sans font-bold text-sm truncate">{cleanTitle(book?.title || '')}</h1>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.5, s - 0.1)); }} className="rounded-full h-8 w-8 text-primary">
                            <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[9px] font-bold w-8 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(3, s + 0.1)); }} className="rounded-full h-8 w-8 text-primary">
                            <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="rounded-full h-9 w-9 text-primary">
                            <Search className="h-4 w-4" />
                        </Button>
                        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-primary/10">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[80vh] rounded-t-[2rem] bg-background/95 backdrop-blur-3xl">
                                <SheetHeader className="mb-6 pt-4 px-4">
                                    <div className="h-1 w-12 bg-primary/20 rounded-full mb-4 mx-auto" />
                                    <SheetTitle className="text-xl font-bold">{t('settings')}</SheetTitle>
                                </SheetHeader>
                                <div className="space-y-6 px-4 pb-20 overflow-y-auto max-h-[60vh]">
                                    {/* Reading Mode for Mobile — only single page */}
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('readingMode')}</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSettings({ readingMode: 'single' })}
                                                className={`flex-1 p-3 rounded-xl text-xs font-bold transition-all ${settings.readingMode === 'single' ? 'bg-primary text-white' : 'bg-secondary'}`}
                                            >
                                                {t('singlePage')}
                                            </button>
                                            <span className="text-[10px] text-muted-foreground italic">Çift sayfa bilgisayarda kullanılabilir</span>
                                        </div>
                                    </div>

                                    {/* Drawing Tools for Mobile */}
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('drawingTools')}</span>
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'cursor', icon: MousePointer2, label: t('cursor') },
                                                { id: 'marker', icon: Highlighter, label: t('highlight') },
                                                { id: 'pen', icon: PenTool, label: t('pen') },
                                                { id: 'eraser', icon: Eraser, label: t('eraser') }
                                            ].map((tool) => (
                                                <Button
                                                    key={tool.id}
                                                    variant={activeTool === tool.id ? 'default' : 'outline'}
                                                    size="icon"
                                                    onClick={() => setActiveTool(tool.id as any)}
                                                    className="rounded-full h-10 w-10"
                                                >
                                                    <tool.icon className="h-4 w-4" />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Zoom for Mobile */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('zoom')}</span>
                                            <span className="text-sm font-bold">{Math.round(scale * 100)}%</span>
                                        </div>
                                        <Slider
                                            value={[scale]}
                                            min={0.5}
                                            max={2}
                                            step={0.1}
                                            onValueChange={([v]) => setScale(v)}
                                        />
                                    </div>

                                    {/* Theme */}
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('theme')}</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'light', label: t('light'), color: 'bg-white' },
                                                { id: 'sepia', label: t('sepia'), color: 'bg-[#f4ecd8]' },
                                                { id: 'dark', label: t('dark'), color: 'bg-slate-900' }
                                            ].map(theme => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => setSettings({ theme: theme.id as any })}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${settings.theme === theme.id ? 'ring-2 ring-primary' : 'bg-secondary/50'}`}
                                                >
                                                    <div className={`h-8 w-8 rounded-full ${theme.color} border`} />
                                                    <span className="text-xs font-bold">{theme.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Font Size */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('fontSize')}</span>
                                            <span className="text-sm font-bold">{settings.fontSize}%</span>
                                        </div>
                                        <Slider
                                            value={[settings.fontSize]}
                                            min={50}
                                            max={200}
                                            step={10}
                                            onValueChange={([v]) => setSettings({ fontSize: v })}
                                        />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Desktop Header - Full Featured */}
                <header className="hidden sm:flex h-14 px-6 rounded-full bg-background/60 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] items-center justify-between gap-6 pointer-events-auto transition-all duration-500 hover:scale-[1.01] hover:bg-background/80 max-w-[95vw]">
                    <div className="flex items-center gap-4 border-r border-border/10 pr-6">
                        <Button variant="ghost" size="icon" onClick={() => setIsNotesOpen(true)} className="rounded-full h-9 w-9 hover:bg-orange-500/10 transition-all text-orange-500" title={t('notesAndHighlights')}>
                            <StickyNote className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" className="flex items-center gap-2 px-3 rounded-xl hover:bg-primary/10 transition-all text-primary group" onClick={() => navigate('/library')}>
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">{t('librarySmall')}</span>
                        </Button>
                        <div className="flex flex-col min-w-[100px]">
                            <h1 className="font-sans font-bold text-sm tracking-tight leading-none mb-1 truncate max-w-[200px] text-foreground">{activePanel === 'primary' ? cleanTitle(book?.title || '') : cleanTitle(secondaryBook?.title || '')}</h1>
                            <p className="font-sans text-[10px] font-bold tracking-wide text-muted-foreground">{activePanel === 'primary' ? cleanAuthor(book?.author || '') : cleanAuthor(secondaryBook?.author || '')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 border-l border-border/10 pl-6 no-zen-toggle">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-secondary/30 rounded-full p-0.5 border border-border/10">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.5, s - 0.1)); }} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all"><ZoomOut className="h-3.5 w-3.5" /></Button>
                            <span className="text-[10px] font-bold w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(3, s + 0.1)); }} className="rounded-full h-8 w-8 hover:bg-primary hover:text-white transition-all"><ZoomIn className="h-3.5 w-3.5" /></Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-1 opacity-20 hidden lg:block" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSearchOpen(true)}
                            className={`rounded-full h-9 w-9 transition-all ${isSearchOpen ? 'bg-primary text-white' : 'hover:bg-primary/10 text-primary'}`}
                            title={t('search')}
                        >
                            <Search className="h-4 w-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6 mx-1 opacity-20 hidden lg:block" />

                        {/* Drawing Tools */}
                        <div className="flex items-center bg-secondary/30 rounded-full p-0.5 border border-border/10">
                            {[
                                { id: 'cursor', icon: MousePointer2, label: t('cursor') },
                                { id: 'marker', icon: Highlighter, label: t('highlight') },
                                { id: 'pen', icon: PenTool, label: t('pen') },
                                { id: 'eraser', icon: Eraser, label: t('eraser') }
                            ].map((tool) => (
                                <Button
                                    key={tool.id}
                                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); setActiveTool(tool.id as any); }}
                                    className={`rounded-full h-8 w-8 transition-all ${activeTool === tool.id ? 'shadow-lg bg-primary text-white' : 'hover:bg-primary/10'}`}
                                    title={tool.label}
                                >
                                    <tool.icon className="h-4 w-4" />
                                </Button>
                            ))}
                        </div>

                        {/* Tool Settings Dropdown */}
                        {activeTool !== 'cursor' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20 transition-all text-primary no-zen-toggle">
                                        <Palette className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 p-4 rounded-3xl bg-background/95 backdrop-blur-2xl border-white/10 shadow-2xl z-[101]">
                                    <div className="space-y-6">
                                        {activeTool !== 'eraser' && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-40">{t('color')}</span>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#000000', '#64748b', '#eab308', '#ec4899', '#14b8a6'].map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={(e) => { e.stopPropagation(); setToolSettings(s => ({ ...s, color: c })); }}
                                                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${toolSettings.color === c ? 'border-primary ring-1 ring-primary/40' : 'border-transparent'}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-40">{t('thickness')}</span>
                                                <span className="text-xs font-bold font-mono">{toolSettings.width}px</span>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Slider
                                                    value={[toolSettings.width]}
                                                    min={1}
                                                    max={20}
                                                    step={1}
                                                    onValueChange={([v]) => setToolSettings(s => ({ ...s, width: v }))}
                                                />
                                            </div>
                                        </div>
                                        {activeTool !== 'eraser' && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase tracking-wider opacity-40">{t('opacity')}</span>
                                                    <span className="text-xs font-bold font-mono">%{Math.round(toolSettings.opacity * 100)}</span>
                                                </div>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Slider
                                                        value={[toolSettings.opacity]}
                                                        min={0.1}
                                                        max={1}
                                                        step={0.1}
                                                        onValueChange={([v]) => setToolSettings(s => ({ ...s, opacity: v }))}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <style>{`
                            .react-pdf__Page {
                                user-select: none !important;
                                pointer-events: none !important;
                            }
                            .react-pdf__Page__textContent {
                                user-select: text !important;
                                z-index: 30 !important;
                                pointer-events: auto !important;
                                opacity: 1 !important;
                            }
                            .react-pdf__Page__annotations {
                                pointer-events: none !important;
                                z-index: 5 !important;
                            }
                            .react-pdf__Page__canvas {
                                pointer-events: none !important;
                                user-select: none !important;
                                z-index: 1 !important;
                            }
                            .react-pdf__Page__textContent ::selection {
                                background: rgba(249, 115, 22, 0.3) !important;
                                color: inherit !important;
                            }
                        `}</style>
                        <Separator orientation="vertical" className="h-6 mx-1 opacity-20" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[180px] h-10 px-4 justify-between border-2 border-primary/10 bg-background/50 backdrop-blur-md rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-primary hover:bg-primary/5 transition-all shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Columns className="h-4 w-4 text-primary" />
                                        <span>
                                            {settings.readingMode === 'single' && t('singlePage')}
                                            {settings.readingMode === 'double-animated' && t('doubleAnimated')}
                                            {settings.readingMode === 'double-static' && t('doubleStatic')}
                                            {settings.readingMode === 'split' && t('splitScreen')}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px] rounded-xl p-2 bg-card/95 backdrop-blur-2xl shadow-2xl border-border/20 z-[100]">
                                {[
                                    { id: 'single', label: t('singlePageMode') },
                                    { id: 'double-animated', label: t('doubleAnimatedMode') },
                                    { id: 'double-static', label: t('doubleStaticMode') },
                                    { id: 'split', label: t('splitScreenMode') }
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
                                    <SheetTitle className="text-3xl font-black italic tracking-tighter flex items-center gap-3">{t('settings').toUpperCase()} <Settings className="h-6 w-6 text-primary animate-[spin_4s_linear_infinite]" /></SheetTitle>
                                    <SheetDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">{t('personalizeReading')}</SheetDescription>
                                </SheetHeader>
                                <div className="space-y-12 px-4 pb-20 no-scrollbar overflow-y-auto max-h-[70vh]">
                                    <div className="space-y-6">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">{t('appearanceTheme')} <div className="flex-1 h-px bg-primary/10" /></h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[{ id: 'light', color: 'bg-white', label: t('light').toUpperCase(), border: 'border-slate-200' }, { id: 'sepia', color: 'bg-[#f4ecd8]', label: t('sepia').toUpperCase(), border: 'border-[#e4dcc8]' }, { id: 'dark', color: 'bg-slate-950', label: t('dark').toUpperCase(), border: 'border-slate-800' }].map(t => (
                                                <button key={t.id} onClick={() => setSettings({ theme: t.id as any })} className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-300 ${settings.theme === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/10 bg-secondary/5 hover:border-border/30 hover:bg-secondary/10'}`}>
                                                    <div className={`h-14 w-14 rounded-full ${t.color} border ${t.border} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                                    {settings.theme === t.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center"><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{t('fontSizeTitle')}</h3><span className="text-sm font-black tabular-nums bg-primary/10 px-3 py-1 rounded-full text-primary">%{settings.fontSize}</span></div>
                                        <div className="px-2 pt-2"><Slider value={[settings.fontSize]} min={50} max={200} step={10} onValueChange={([v]) => setSettings({ fontSize: v })} className="py-4" /><div className="flex justify-between mt-2 px-1"><span className="text-[9px] font-black opacity-30">{t('small')}</span><span className="text-[9px] font-black opacity-30">{t('large')}</span></div></div>
                                    </div>

                                    <div className="space-y-10 border-t border-primary/5 pt-10">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">{t('advancedTypography')} <div className="flex-1 h-px bg-primary/10" /></h3>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">{t('lineSpacing')}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{t('lineSpacingDesc')}</span>
                                                </div>
                                                <span className="text-xs font-black tabular-nums">{settings.lineHeight}</span>
                                            </div>
                                            <div className="px-2">
                                                <Slider value={[settings.lineHeight]} min={1} max={2.5} step={0.1} onValueChange={([v]) => setSettings({ lineHeight: v })} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">{t('letterSpacing')}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{t('letterSpacingDesc')}</span>
                                                </div>
                                                <span className="text-xs font-black tabular-nums">{settings.letterSpacing}{t('letterSpacingSuffix')}</span>
                                            </div>
                                            <div className="px-2">
                                                <Slider value={[settings.letterSpacing]} min={-1} max={5} step={0.5} onValueChange={([v]) => setSettings({ letterSpacing: v })} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-2xl border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center gap-1 h-auto py-4"
                                                onClick={() => setSettings({
                                                    margin: 60,
                                                    paddingTop: 80,
                                                    paddingBottom: 80,
                                                    lineHeight: 1.6
                                                })}
                                            >
                                                <span className="text-xs font-black uppercase tracking-widest">{t('goldenRatio')}</span>
                                                <span className="text-[9px] font-medium text-muted-foreground">{t('goldenRatioDesc')}</span>
                                            </Button>

                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">{t('margins')}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{t('marginsDesc')}</span>
                                                </div>
                                                <span className="text-xs font-black tabular-nums">{settings.margin}{t('letterSpacingSuffix')}</span>
                                            </div>
                                            <div className="px-2">
                                                <Slider value={[settings.margin]} min={0} max={100} step={5} onValueChange={([v]) => setSettings({ margin: v })} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">{t('paddingTop')}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{t('paddingTopDesc')}</span>
                                                </div>
                                                <span className="text-xs font-black tabular-nums">{settings.paddingTop}{t('letterSpacingSuffix')}</span>
                                            </div>
                                            <div className="px-2">
                                                <Slider value={[settings.paddingTop]} min={0} max={100} step={5} onValueChange={([v]) => setSettings({ paddingTop: v })} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">{t('paddingBottom')}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{t('paddingBottomDesc')}</span>
                                                </div>
                                                <span className="text-xs font-black tabular-nums">{settings.paddingBottom}{t('letterSpacingSuffix')}</span>
                                            </div>
                                            <div className="px-2">
                                                <Slider value={[settings.paddingBottom]} min={0} max={100} step={5} onValueChange={([v]) => setSettings({ paddingBottom: v })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>
            </div>

            {/* Premium Floating Navigation Buttons (Side) - Minimalist & Zen aware - HIDDEN IN SPLIT MODE */}
            {settings.readingMode !== 'split' && (
                <>
                    <div className={`absolute top-1/2 -translate-y-1/2 left-4 z-[80] hidden md:block transition-all duration-700 ${isUIVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                        <Button variant="ghost" size="icon" onClick={prevPage} className="h-20 w-12 rounded-2xl bg-background/40 backdrop-blur-md border border-white/10 hover:bg-primary/20 hover:text-primary transition-all group/btn shadow-sm">
                            <ChevronLeft className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </Button>
                    </div>
                    <div className={`absolute top-1/2 -translate-y-1/2 right-4 z-[80] hidden md:block transition-all duration-700 ${isUIVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                        <Button variant="ghost" size="icon" onClick={nextPage} className="h-20 w-12 rounded-2xl bg-background/40 backdrop-blur-md border border-white/10 hover:bg-primary/20 hover:text-primary transition-all group/btn shadow-sm">
                            <ChevronRight className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </Button>
                    </div>
                    {/* Mobile tap-to-navigate: invisible touch zones on left/right 15% */}
                    <div
                        className="absolute inset-y-0 left-0 w-[10%] z-5 md:hidden cursor-pointer active:bg-black/5"
                        onClick={(e) => {
                            if (window.getSelection()?.toString()) return;
                            e.stopPropagation();
                            prevPage();
                        }}
                    />
                    <div
                        className="absolute inset-y-0 right-0 w-[10%] z-5 md:hidden cursor-pointer active:bg-black/5"
                        onClick={(e) => {
                            if (window.getSelection()?.toString()) return;
                            e.stopPropagation();
                            nextPage();
                        }}
                    />
                </>
            )}

            {/* TTS Controller - Zen Mode Controlled */}
            <div className={`transition-all duration-700 ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <TTSController
                    onGetText={async () => {
                        if (readerRef.current) return await readerRef.current.getCurrentText();
                        return '';
                    }}
                    onNext={nextPage}
                    onPrev={prevPage}
                />
            </div>

            <main className="flex-1 relative overflow-hidden flex items-center justify-center w-full min-h-0 bg-background pt-14 sm:pt-16 pb-16 sm:pb-20">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={`${book.id}-${secondaryBook?.id || 'none'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full flex items-center justify-center transform-gpu"
                    >
                        <div
                            className={`w-full h-full transition-all duration-500 rounded-3xl overflow-hidden relative ${isSettingsOpen ? 'scale-95 opacity-50' : 'scale-100 opacity-100'} ${activePanel === 'primary' ? 'ring-2 ring-primary/40 ring-offset-8 ring-offset-background shadow-[0_0_50px_rgba(249,115,22,0.1)]' : 'border border-transparent'}`}
                            onClick={() => setActivePanel('primary')}
                        >
                            <ReaderContainer
                                ref={readerRef}
                                book={book!}
                                data={bookData!}
                                pageNumber={book?.progress?.page || 1}

                                secondaryBook={secondaryBook}
                                secondaryData={secondaryBookData}
                                secondaryPageNumber={secondaryBook?.progress?.page || 1}
                                onSecondaryLocationChange={handleSecondaryLocationChange}
                                activePanel={activePanel}
                                onPanelActivate={setActivePanel}
                                onSecondaryTotalPages={setSecondaryTotalPages}

                                onLocationChange={handleLocationChange}
                                onTotalPages={setTotalPages}
                                scale={scale}
                                onTextSelected={handleTextSelected}
                                annotations={book ? (storeAnnotations[book.id] || []) : []}
                                onOpenSettings={() => setIsBookSelectOpen(true)}
                            />
                        </div>

                        {book && (
                            <DrawingCanvas
                                active={activeTool !== 'cursor'}
                                tool={activeTool as any}
                                pageKey={`${book.id}-${book.progress?.page || 1}`}
                                savedData={drawings[`${book.id}-${book.progress?.page || 1}`]}
                                onSave={(data) => saveDrawing(`${book.id}-${book.progress?.page || 1}`, data)}
                                settings={toolSettings}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Selection & AI Components */}
                {!isQuoteModalOpen && !isAIOpen && !isNoteDialogOpen && (
                    <SelectionToolbar
                        selection={selection}
                        onClose={() => setSelection(null)}
                        onAction={(action, color) => {
                            if (action === 'ai') setIsAIOpen(true);
                            if (action === 'note') setIsNoteDialogOpen(true);
                            if (action === 'share') setIsQuoteModalOpen(true);
                            if (action === 'highlight' && selection) {
                                addAnnotation(book.id, {
                                    id: crypto.randomUUID(),
                                    cfiRange: selection.cfi,
                                    text: selection.text,
                                    color: color || 'rgba(255, 255, 0, 0.4)',
                                    type: 'highlight',
                                    createdAt: new Date().toISOString()
                                });
                                setSelection(null);
                            }
                        }}
                    />
                )}


                <QuoteModal
                    isOpen={isQuoteModalOpen}
                    onClose={() => setIsQuoteModalOpen(false)}
                    selection={selection}
                    book={activePanel === 'primary' ? book : secondaryBook}
                />
                <AIAssistant
                    isOpen={isAIOpen}
                    onClose={() => setIsAIOpen(false)}
                    selection={selection}
                />

                <NotesSidebar
                    isOpen={isNotesOpen}
                    onClose={() => setIsNotesOpen(false)}
                    annotations={storeAnnotations[book?.id || ''] || []}
                    onDelete={(aid) => removeAnnotation(book?.id || '', aid)}
                    onJump={(cfi) => {
                        readerRef.current?.goToLocation?.(cfi);
                        setIsNotesOpen(false);
                    }}
                    bookTitle={book?.title || t('bookGeneric')}
                />

                {/* Note Dialog */}
                <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                    <DialogContent className="rounded-[2.5rem] p-8 max-w-md bg-card/90 backdrop-blur-2xl border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-serif">{t('addNote')}</DialogTitle>
                            <DialogDescription className="italic">
                                "{selection?.text.slice(0, 40)}..."
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <textarea
                                className="w-full h-32 bg-secondary/30 rounded-2xl p-4 border border-border/40 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                placeholder={t('writeThoughts')}
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setIsNoteDialogOpen(false)}>{t('cancel')}</Button>
                            <Button className="rounded-2xl px-6" onClick={() => {
                                if (selection && book) {
                                    addAnnotation(book.id, {
                                        id: crypto.randomUUID(),
                                        cfiRange: selection.cfi,
                                        text: selection.text,
                                        note: noteDraft,
                                        color: 'rgba(255, 165, 0, 0.3)', // Default note color
                                        type: 'note',
                                        createdAt: new Date().toISOString()
                                    });
                                    setSelection(null);
                                    setIsNoteDialogOpen(false);
                                    setNoteDraft('');
                                    toast.success(t('noteSaved'));
                                }
                            }}>{t('save')}</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>

            {/* Minimalist Bottom Footer - Zen aware */}
            <div className={`absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 h-12 sm:h-14 px-4 sm:px-8 rounded-2xl bg-background/60 backdrop-blur-2xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 sm:gap-8 z-[90] max-w-[95vw] transition-all duration-700 ${isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                {/* Internal contents go here */}
                {settings.readingMode === 'split' && secondaryBook ? (
                    <div className="flex flex-col gap-2 py-2 border-r border-white/10 pr-8">
                        {/* Primary Book Row */}
                        <div className="flex items-center gap-4">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all ${activePanel === 'primary' ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-white/10 text-white/40'}`}>1</span>
                            <div className="w-48 h-1.5 bg-secondary/40 rounded-full cursor-pointer hover:h-2 transition-all group/scroll1"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const pct = Math.max(0, Math.min(1, x / rect.width));
                                    const pct100 = pct * 100;
                                    setActivePanel('primary');
                                    if (book?.format === 'epub') {
                                        readerRef.current?.goToPercentage?.(pct100);
                                    } else {
                                        const targetPage = Math.max(1, Math.round(pct * totalPages));
                                        handleLocationChange(String(targetPage), pct100);
                                    }
                                }}>
                                <div className={`h-full rounded-full transition-all duration-300 ${activePanel === 'primary' ? 'bg-primary' : 'bg-primary/40'}`}
                                    style={{ width: `${book?.progress?.percentage || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-bold tabular-nums min-w-[40px] opacity-60">%{Math.round(book?.progress?.percentage || 0)}</span>
                        </div>
                        {/* Secondary Book Row */}
                        <div className="flex items-center gap-4">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all ${activePanel === 'secondary' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'bg-white/10 text-white/40'}`}>2</span>
                            <div className="w-48 h-1.5 bg-secondary/40 rounded-full cursor-pointer hover:h-2 transition-all group/scroll2"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const pct = Math.max(0, Math.min(1, x / rect.width));
                                    const pct100 = pct * 100;
                                    setActivePanel('secondary');
                                    if (secondaryBook?.format === 'epub') {
                                        readerRef.current?.goToSecondaryPercentage?.(pct100);
                                    } else {
                                        const targetPage = Math.max(1, Math.round(pct * secondaryTotalPages));
                                        handleSecondaryLocationChange(String(targetPage), pct100);
                                    }
                                }}>
                                <div className={`h-full rounded-full transition-all duration-300 ${activePanel === 'secondary' ? 'bg-orange-500' : 'bg-orange-500/40'}`}
                                    style={{ width: `${secondaryBook?.progress?.percentage || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-bold tabular-nums min-w-[40px] opacity-60">%{Math.round(secondaryBook?.progress?.percentage || 0)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-8 border-r border-white/10 pr-8">
                        <span className="text-[11px] font-bold text-foreground tracking-tight">
                            {t('progressLabel', { percent: Math.round(book?.progress?.percentage || 0) })}
                        </span>
                        <div className="w-32 sm:w-64 h-3 sm:h-2 bg-secondary/40 rounded-full cursor-pointer hover:scale-y-125 transition-all group/scroll"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const pct = Math.max(0, Math.min(1, x / rect.width));
                                const pct100 = pct * 100;
                                if (book?.format === 'epub') {
                                    readerRef.current?.goToPercentage?.(pct100);
                                } else {
                                    const targetPage = Math.max(1, Math.round(pct * totalPages));
                                    handleLocationChange(String(targetPage), pct100);
                                }
                            }}>
                            <div className="h-full bg-primary rounded-full transition-all duration-300 relative"
                                style={{ width: `${book?.progress?.percentage || 0}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary border-4 border-background rounded-full shadow-lg scale-0 group-hover/scroll:scale-100 transition-transform" />
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-1 group/page">
                    <input
                        type="text"
                        className="w-10 h-6 bg-transparent hover:bg-white/10 focus:bg-white/20 border-none outline-none text-[11px] font-bold tabular-nums text-foreground tracking-tight text-center rounded-lg transition-all focus:ring-1 focus:ring-primary/40 p-0"
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const targetPage = parseInt(jumpPage);
                                if (!isNaN(targetPage) && targetPage > 0 && targetPage <= totalPages) {
                                    if (activePanel === 'primary') {
                                        if (book?.format === 'epub') {
                                            const pct = (targetPage / totalPages) * 100;
                                            readerRef.current?.goToPercentage?.(pct);
                                        } else {
                                            handleLocationChange(String(targetPage), (targetPage / totalPages) * 100);
                                        }
                                    } else {
                                        if (secondaryBook?.format === 'pdf') {
                                            handleSecondaryLocationChange(String(targetPage), (targetPage / totalPages) * 100);
                                        }
                                    }
                                }
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />
                    <span className="text-[11px] font-bold tabular-nums text-foreground tracking-tight opacity-40">/</span>
                    <span className="text-[11px] font-bold tabular-nums text-foreground tracking-tight opacity-40">{activePanel === 'primary' ? totalPages : secondaryTotalPages}</span>
                </div>
            </div>

            {/* Book Selection Dialog */}
            <Dialog open={isBookSelectOpen} onOpenChange={setIsBookSelectOpen}>
                <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-2xl border-primary/10 rounded-[32px] p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black italic tracking-tighter">{t('selectSecondaryBook')}</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('comparativeReadingDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 pt-0 max-h-[60vh] overflow-y-auto">
                        {books.filter(b => b.id !== id && b.id !== secondaryBookId).map(b => (
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
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-white/10 shadow-3xl rounded-[2.5rem] gap-0">
                    <div className="p-8 pb-6 border-b border-border/10 bg-gradient-to-br from-primary/5 to-transparent">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Search className="h-5 w-5 text-primary" />
                                </div>
                                {t('bookSearch')}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2 p-1 bg-secondary/20 rounded-2xl border border-border/10">
                                <Input
                                    placeholder={t('searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="border-none bg-transparent h-12 text-base focus-visible:ring-0 placeholder:text-muted-foreground/50"
                                    autoFocus
                                />
                                <div className="flex items-center gap-1 pr-1">
                                    <Button
                                        variant={useRegex ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setUseRegex(!useRegex)}
                                        className={`h-10 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${useRegex ? 'shadow-lg shadow-primary/20' : 'opacity-40 hover:opacity-100'}`}
                                        title={t('useRegex')}
                                    >
                                        .*
                                    </Button>
                                    <Button
                                        onClick={() => handleSearch()}
                                        disabled={isSearching}
                                        size="icon"
                                        className="h-10 w-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                    >
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Search History Chips */}
                            {!searchQuery && searchHistory.length > 0 && (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30 mr-2">{t('searchHistory')}:</span>
                                    {searchHistory.map((h, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(h)}
                                            className="px-3 py-1 rounded-full bg-secondary/40 hover:bg-primary/10 hover:text-primary border border-border/10 text-[10px] font-bold transition-all"
                                        >
                                            {h}
                                        </button>
                                    ))}
                                    <button onClick={clearHistory} className="p-1 opacity-20 hover:opacity-100 transition-opacity ml-auto">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto p-4 no-scrollbar bg-card/30">
                        {isSearching ? (
                            <div className="py-24 text-center space-y-4">
                                <div className="relative h-16 w-16 mx-auto">
                                    <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">{t('searching')}</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-2">
                                <div className="px-4 py-2 border-b border-border/5 mb-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                        {t('resultsFound', { count: searchResults.length })}
                                    </p>
                                </div>
                                {searchResults.map((res, i) => (
                                    <button
                                        key={i}
                                        onClick={() => jumpToSearchResult(res.cfi)}
                                        className="w-full text-left p-5 hover:bg-primary/5 rounded-[1.5rem] transition-all group border border-transparent hover:border-primary/10 relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-1 rounded-full bg-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                                                    {t('page')} {res.page || '?'}
                                                </span>
                                            </div>
                                            <ArrowRight className="h-3 w-3 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </div>
                                        <div className="text-sm text-foreground/70 leading-relaxed font-sans line-clamp-3 group-hover:text-foreground transition-colors italic">
                                            {highlightText(res.excerpt, searchQuery)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : searchQuery && !isSearching ? (
                            <div className="py-24 text-center space-y-4 opacity-40">
                                <div className="h-20 w-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest">{t('noSearchResults')}</p>
                            </div>
                        ) : (
                            <div className="py-24 text-center space-y-6 opacity-30">
                                <div className="h-24 w-24 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 relative">
                                    <BookOpen className="h-12 w-12" />
                                    <div className="absolute inset-0 rounded-full border border-dashed border-primary/30 animate-[spin_20s_linear_infinite]" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">{t('bookSearch')}</p>
                                    <p className="text-[10px] font-bold max-w-[200px] mx-auto leading-relaxed uppercase tracking-wider">{t('searchInBooks')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default ReaderPage;
