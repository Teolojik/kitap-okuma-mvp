
import { useEffect, useRef, useState } from 'react';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Search, Library, ArrowRight, BookOpen, Star, MoreVertical, Trash2, Filter, LayoutGrid, List, Plus, Calendar } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { parseBookFilename, cleanTitle, cleanAuthor } from '@/lib/metadata-utils';
import { getCleanCoverUrl } from '@/lib/discovery-service';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookCover } from '@/components/ui/BookCover';

// Preload transparent pixel once to avoid first-drag "ghost" bug
const transparentPixel = new Image();
transparentPixel.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

import { useTranslation } from '@/lib/translations';

export default function LibraryPage() {
    const { books, settings, collections, fetchBooks, uploadBook, deleteBook, toggleFavorite, addCollection, removeCollection, assignToCollection, loading } = useBookStore();
    const t = useTranslation(settings.language);
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCollection, setSelectedCollection] = useState('all');
    const [isNewCollectionOpen, setIsNewCollectionOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [draggedBookId, setDraggedBookId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        fetchBooks();

        const handleGlobalDrag = (e: DragEvent) => {
            if (draggedBookId) {
                setMousePos({ x: e.clientX, y: e.clientY });
            }
        };

        // Listen for background metadata updates (lazy loading)
        const handleBooksUpdated = () => {
            fetchBooks(); // Refresh books when background processing completes
        };

        window.addEventListener('dragover', handleGlobalDrag);
        window.addEventListener('books-updated', handleBooksUpdated);

        return () => {
            window.removeEventListener('dragover', handleGlobalDrag);
            window.removeEventListener('books-updated', handleBooksUpdated);
        };
    }, [draggedBookId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            toast.info(t('scanningBook'));
            const meta = parseBookFilename(file.name);
            await uploadBook(file, meta);
            toast.success(t('bookAdded'));
        } catch (error) {
            toast.error(t('uploadError'));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getCollName = (c: any) => {
        if (c.id === 'all') return t('allBooks');
        if (c.id === 'favorites') return t('favorites');
        if (c.id === 'reading') return t('readingNow');
        if (c.id === 'finished') return t('finished');
        return c.name;
    };

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCollection = true;
        if (selectedCollection === 'favorites') matchesCollection = !!book.is_favorite;
        else if (selectedCollection === 'reading') matchesCollection = (book.progress?.percentage || 0) > 0 && (book.progress?.percentage || 0) < 100;
        else if (selectedCollection === 'finished') matchesCollection = (book.progress?.percentage || 0) >= 100;
        else if (selectedCollection !== 'all') matchesCollection = book.collection_id === selectedCollection;

        return matchesSearch && matchesCollection;
    });

    // Sort books by activity (progress.lastActive) or fallback to creation date
    const sortedBooks = [...filteredBooks].sort((a, b) => {
        const dateA = a.progress?.lastActive ? new Date(a.progress.lastActive).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.progress?.lastActive ? new Date(b.progress.lastActive).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);

        const timeA = isNaN(dateA) ? 0 : dateA;
        const timeB = isNaN(dateB) ? 0 : dateB;

        return timeB - timeA;
    });

    // The highlight card should ALWAYS show the absolute latest active book
    const latestBook = books.length > 0 ? [...books].sort((a, b) => {
        const dateA = a.progress?.lastActive ? new Date(a.progress.lastActive).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.progress?.lastActive ? new Date(b.progress.lastActive).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);

        const timeA = isNaN(dateA) ? 0 : dateA;
        const timeB = isNaN(dateB) ? 0 : dateB;

        return timeB - timeA;
    })[0] : null;

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        try {
            const newColl = {
                id: crypto.randomUUID(),
                name: newCollectionName,
                created_at: new Date().toISOString()
            };
            addCollection(newColl);
            setNewCollectionName('');
            setIsNewCollectionOpen(false);
            toast.success(t('newCollection') + ' ' + t('collectionDeleted').replace(t('collectionDeleted').split(' ')[0], ''));
        } catch (error) {
            toast.error(t('uploadError'));
        }
    };

    const handleDrop = async (e: React.DragEvent, collectionId: string) => {
        e.preventDefault();
        setDragOverId(null);
        if (!draggedBookId) return;

        try {
            await assignToCollection(draggedBookId, collectionId === 'all' ? null : collectionId);
            setDraggedBookId(null);
        } catch (error) {
            toast.error(t('uploadError'));
        }
    };

    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

    const QUOTES = [
        { text: t('quote1'), author: t('quote1Author') },
        { text: t('quote2'), author: t('quote2Author') },
        { text: t('quote3'), author: t('quote3Author') },
        { text: t('quote4'), author: t('quote4Author') }
    ];

    useEffect(() => {
        // Pick individual random quote on mount
        setCurrentQuoteIndex(Math.floor(Math.random() * QUOTES.length));

        // Change periodically
        const interval = setInterval(() => {
            setCurrentQuoteIndex(prev => (prev + 1) % QUOTES.length);
        }, 20000);
        return () => clearInterval(interval);
    }, []);

    const draggedBookMeta = draggedBookId ? books.find(b => b.id === draggedBookId) : null;

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-0 h-full relative">
            {/* Pixel-Perfect Ultra-Premium Drag Preview Overlay */}
            <AnimatePresence>
                {draggedBookId && draggedBookMeta && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
                        animate={{
                            scale: 1.1,
                            opacity: 1,
                            rotate: 4 // Fixed subtle tilt to avoid jitter while moving
                        }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.5 }}
                        className="fixed z-[9999] pointer-events-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden border border-white/40 ring-1 ring-black/5"
                        style={{
                            left: mousePos.x - 45,
                            top: mousePos.y - 65,
                            width: 90,
                            height: 135,
                        }}
                    >
                        <img
                            src={draggedBookMeta.cover_url || ''}
                            className="w-full h-full object-cover rounded-2xl"
                            alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/20 pointer-events-none" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Collections Bar (Horizontal Scroll) */}
            <div className="lg:hidden flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {collections.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCollection(c.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all ${selectedCollection === c.id ? 'bg-primary text-white shadow-lg' : 'bg-secondary/50 text-muted-foreground'}`}
                    >
                        {getCollName(c)}
                    </button>
                ))}
            </div>

            {/* Left Sidebar: Collections */}
            <aside className="hidden lg:flex w-64 flex-col gap-8 sticky top-0 h-fit">
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-4">{t('collections')}</h3>
                    <div className="flex flex-col gap-1">
                        {collections.map(c => {
                            const isSystemCollection = ['all', 'favorites', 'reading', 'finished'].includes(c.id);
                            return (
                                <div key={c.id} className="relative group/coll">
                                    <button
                                        onClick={() => setSelectedCollection(c.id)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (c.id !== 'all') setDragOverId(c.id);
                                        }}
                                        onDragLeave={() => setDragOverId(null)}
                                        onDrop={(e) => handleDrop(e, c.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${selectedCollection === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'} ${dragOverId === c.id ? 'ring-2 ring-primary scale-105 bg-primary/5' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${selectedCollection === c.id ? 'bg-primary text-white' : 'bg-secondary group-hover:bg-secondary-foreground/10'}`}>
                                                <Library className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-bold">{getCollName(c)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black opacity-30 ${selectedCollection === c.id ? 'opacity-100' : ''}`}>
                                                {c.id === 'all' ? books.length :
                                                    c.id === 'favorites' ? books.filter(b => b.is_favorite).length :
                                                        books.filter(b => b.collection_id === c.id).length}
                                            </span>
                                        </div>
                                    </button>

                                    {!isSystemCollection && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`"${c.name}" ${t('confirmDeleteCollection')}`)) {
                                                    removeCollection(c.id);
                                                    if (selectedCollection === c.id) setSelectedCollection('all');
                                                    toast.success(t('collectionDeleted'));
                                                }
                                            }}
                                            className="absolute right-10 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover/coll:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all z-10"
                                            title={t('deleteCollection')}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => setIsNewCollectionOpen(true)}
                        className="w-full justify-start gap-4 p-3 rounded-2xl text-muted-foreground hover:text-primary transition-colors border-2 border-dashed border-primary/10 hover:border-primary/30"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest">{t('newCollection')}</span>
                    </Button>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-orange-500/5 p-6 rounded-[2.5rem] border border-primary/10 min-h-[140px] flex flex-col justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuoteIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-4"
                        >
                            <p className="text-xs font-bold text-primary/80 leading-relaxed italic">
                                "{QUOTES[currentQuoteIndex].text}"
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                — {QUOTES[currentQuoteIndex].author}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </aside>

            {/* Middle Section: Main Content */}
            <div className="flex-1 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header & Search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-3xl font-serif font-medium text-foreground/90 tracking-tight"
                        >
                            {t('happyReading')}, <span className="text-primary italic">{user?.user_metadata?.name || user?.email?.split('@')[0] || t('guest')}</span>
                        </motion.h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {t('libraryWelcomeCount', { count: books.length })}
                        </p>
                    </div>

                    <div className="relative group w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={t('search')}
                            className="w-full bg-card border border-border/40 rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all outline-none text-sm placeholder:text-muted-foreground/60 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Continue Reading Card (Compact) */}
                {latestBook && !searchQuery && (
                    <div className="bg-gradient-to-r from-secondary/50 to-card border border-border/50 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />

                        <div className="w-24 shrink-0 shadow-md">
                            <BookCover
                                url={latestBook.cover_url}
                                title={latestBook.title}
                            />
                        </div>

                        <div className="flex-1 text-center sm:text-left z-10">
                            <h3 className="text-lg font-bold font-serif mb-1 line-clamp-1">{cleanTitle(latestBook.title)}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{cleanAuthor(latestBook.author) || t('unknownAuthor')}</p>
                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                <Link to={`/read/${latestBook.id}`}>
                                    <Button size="sm" className="rounded-full px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                        {t('continueReading')} <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                                <div className="text-xs font-medium text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full border border-border/50">
                                    {t('page')} {latestBook.progress?.page || 1}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Library Grid */}
                <section className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                            <Library className="h-5 w-5 text-primary/70" />
                            {t('myLibrary')}
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-full h-9 px-4 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                        >
                            <Upload className="mr-2 h-3.5 w-3.5" /> {t('addBook')}
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                        <AnimatePresence mode="popLayout">
                            {sortedBooks.length > 0 ? (
                                sortedBooks.map((book) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        key={book.id}
                                        draggable
                                        onDragStart={(e: any) => {
                                            setDraggedBookId(book.id);
                                            e.dataTransfer.setData('bookId', book.id);
                                            e.dataTransfer.setDragImage(transparentPixel, 0, 0);
                                        }}
                                        onDragEnd={() => {
                                            setDraggedBookId(null);
                                            setDragOverId(null);
                                        }}
                                        className={`group relative flex flex-col items-center sm:items-start transition-opacity ${draggedBookId === book.id ? 'opacity-10' : 'opacity-100'}`}
                                    >
                                        <div className="absolute top-2 right-2 z-30">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl bg-background/95 backdrop-blur-xl border-border/50">
                                                    <DropdownMenuItem
                                                        onClick={() => toggleFavorite(book.id)}
                                                        className="gap-2 cursor-pointer font-bold text-xs"
                                                    >
                                                        <Star className={`h-4 w-4 ${book.is_favorite ? 'fill-red-500 text-red-500' : ''}`} />
                                                        {book.is_favorite ? t('removeFromFavorites') : t('addToFavorites')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (window.confirm(t('confirmDeleteBook'))) {
                                                                deleteBook(book.id);
                                                                toast.success(t('bookDeleted'));
                                                            }
                                                        }}
                                                        className="gap-2 cursor-pointer font-bold text-xs text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t('deleteBook')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div
                                            onClick={() => navigate(`/details/${book.id}`)}
                                            className="w-full relative block group/cover cursor-pointer"
                                        >
                                            <div className="transform group-hover/cover:-translate-y-2 transition-transform duration-500">
                                                <BookCover
                                                    url={book.cover_url}
                                                    title={book.title}
                                                />
                                            </div>

                                            {book.progress && book.progress.percentage > 0 && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/50">
                                                    <div className="h-full bg-primary" style={{ width: `${book.progress.percentage}%` }} />
                                                </div>
                                            )}

                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px] z-10">
                                                <Button
                                                    size="sm"
                                                    className="rounded-full shadow-2xl scale-90 group-hover/cover:scale-100 transition-transform font-black text-[10px] uppercase tracking-[0.2em] gap-2 bg-primary hover:bg-primary/90"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/read/${book.id}`);
                                                    }}
                                                >
                                                    <BookOpen className="h-3.5 w-3.5" />
                                                    {t('read')}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-3 w-full text-center sm:text-left space-y-0.5 px-0.5">
                                            <h3 className="font-bold text-[13px] leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors cursor-pointer" title={book.title}>
                                                <Link to={`/read/${book.id}`}>{cleanTitle(book.title)}</Link>
                                            </h3>
                                            <p className="text-[11px] font-medium text-muted-foreground truncate">{cleanAuthor(book.author) || t('unknownAuthor')}</p>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div key="empty-library" className="col-span-full py-24 text-center">
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/30 mb-6">
                                        <Library className="h-10 w-10 text-muted-foreground/30" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground/80 mb-2">{t('noBooksYet')}</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-sm">
                                        {t('emptyLibraryDesc')}
                                    </p>
                                    <Button
                                        className="rounded-full px-8 shadow-lg shadow-primary/20"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" /> {t('uploadFirstBook')}
                                    </Button>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <input type="file" ref={fileInputRef} className="hidden" accept=".epub,.pdf" onChange={handleFileUpload} />

                {/* Create New Collection Dialog */}
                <Dialog open={isNewCollectionOpen} onOpenChange={setIsNewCollectionOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-[2rem] bg-background/95 backdrop-blur-xl border-primary/10 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black italic tracking-tighter">{t('newCollection')}</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                                {t('newCollectionDesc')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest pl-1">{t('collectionName')}</Label>
                                <Input
                                    id="name"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    placeholder={t('collectionPlaceholder')}
                                    className="rounded-2xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 h-12 font-bold px-4"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsNewCollectionOpen(false)} className="rounded-2xl font-bold">{t('cancel')}</Button>
                            <Button onClick={handleCreateCollection} className="rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20">{t('create')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div >

            {/* Right Section: Sidebar (User & Stats) */}
            < div className="hidden lg:block w-[300px] space-y-10 animate-in fade-in slide-in-from-right-4 duration-1000" >
                {/* Profile Card */}
                < div className="flex items-center gap-4 bg-card/40 p-5 rounded-3xl border border-border/40 shadow-sm backdrop-blur-sm" >
                    <Avatar className="h-14 w-14 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'd1'}&backgroundColor=e5e7eb`} />
                        <AvatarFallback>{user?.name?.[0] || t('userInitial')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-foreground/90">{user?.user_metadata?.name || user?.email?.split('@')[0] || t('guestReader')}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('online')}</span>
                        </div>
                    </div>
                </div >

                {/* Simplified Calendar */}
                < div className="space-y-4" >
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> {t('calendar')}
                        </h2>
                    </div>
                    <Card className="rounded-[2.5rem] border-none bg-card/30 shadow-sm overflow-hidden p-6 ring-1 ring-border/30">
                        <div className="flex justify-between text-center">
                            {[t('sunInitial'), t('monInitial'), t('tueInitial'), t('wedInitial'), t('thuInitial'), t('friInitial'), t('satInitial')].map((dayLabel, i) => {
                                const today = new Date();
                                const currentDay = today.getDay(); // 0(Sun) - 6(Sat)
                                // Handle Sunday specifically for monday-first display if needed, but current code uses Sunday-first labels?
                                // Let's check the date logic: date.setDate(today.getDate() - mondayOffset + i)
                                // mondayOffset is offset from CURRENT day to this week's Monday.
                                // If today is Monday(1), mondayOffset = 0. i=0 -> Monday.
                                // So the map is mapping Monday to Sunday. Let's fix labels order if needed.

                                const mondayOffset = (today.getDay() + 6) % 7;
                                const date = new Date(today);
                                date.setDate(today.getDate() - mondayOffset + i);

                                const isToday = date.toDateString() === today.toDateString();

                                // Proper labels for Monday-first:
                                const labels = [t('monInitial'), t('tueInitial'), t('wedInitial'), t('thuInitial'), t('friInitial'), t('satInitial'), t('sunInitial')];

                                return (
                                    <div key={i} className="flex flex-col gap-3 items-center">
                                        <span className="text-[9px] text-muted-foreground/60 font-black">{labels[i]}</span>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isToday ? 'bg-primary text-primary-foreground shadow-lg scale-110' : 'text-foreground/70'}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </div >

                {/* Reading Stats Mini */}
                < div className="bg-primary/5 rounded-[2.5rem] p-6 border border-primary/10 relative overflow-hidden" >
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Star className="w-32 h-32" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-primary mb-1">{t('weeklyGoal')}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{t('maintainingStreak')}</p>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold tabular-nums text-foreground/90">{books.length}</span>
                        <span className="text-sm font-medium text-muted-foreground mb-1.5">{t('booksGoal')}</span>
                    </div>
                    <Progress value={(books.length / 5) * 100} className="h-2 bg-primary/10" />
                </div >
            </div >
        </div >
    );
};
