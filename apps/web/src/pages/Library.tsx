
import { useEffect, useRef, useState } from 'react';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, BookOpen, Search, ArrowRight, Calendar, Star, ChevronLeft, ChevronRight, Trash, Upload, Library } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { parseBookFilename, cleanTitle, cleanAuthor } from '@/lib/metadata-utils';

export default function LibraryPage() {
    const { books, fetchBooks, uploadBook, deleteBook, loading } = useBookStore();
    const { user } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchBooks();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            toast.info('Kitap taranıyor ve kapağı bulunuyor...');
            const meta = parseBookFilename(file.name);
            await uploadBook(file, meta);
            toast.success('Kitap kütüphanenize eklendi!');
        } catch (error) {
            toast.error('Yükleme sırasında bir hata oluştu.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort books by last read or added
    const sortedBooks = [...filteredBooks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestBook = sortedBooks.length > 0 ? sortedBooks[0] : null;

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-0 h-full">
            {/* Left Section: Main Content */}
            <div className="flex-1 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header & Search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-3xl font-serif font-medium text-foreground/90 tracking-tight"
                        >
                            İyi okumalar, <span className="text-primary italic">{user?.name || 'Misafir'}</span>
                        </motion.h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Kütüphanende {books.length} kitap seni bekliyor.
                        </p>
                    </div>

                    <div className="relative group w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Kitap ara..."
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

                        <div className="w-24 shrink-0 aspect-[2/3] rounded-lg shadow-md overflow-hidden relative bg-muted">
                            {latestBook.cover_url ? (
                                <img src={latestBook.cover_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary">
                                    <BookOpen className="h-8 w-8" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left z-10">
                            <h3 className="text-lg font-bold font-serif mb-1 line-clamp-1">{cleanTitle(latestBook.title)}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{cleanAuthor(latestBook.author)}</p>
                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                <Link to={`/read/${latestBook.id}`}>
                                    <Button size="sm" className="rounded-full px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                        Devam Et <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                                <div className="text-xs font-medium text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full border border-border/50">
                                    Sayfa {latestBook.progress?.page || 1}
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
                            Kitaplığım
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-full h-9 px-4 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                        >
                            <Upload className="mr-2 h-3.5 w-3.5" /> KİTAP EKLE
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                        <AnimatePresence>
                            {sortedBooks.length > 0 ? sortedBooks.map((book) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={book.id}
                                    className="group relative flex flex-col items-center sm:items-start"
                                >
                                    <Link to={`/read/${book.id}`} className="w-full">
                                        {/* Book Cover Container */}
                                        <div className="w-full aspect-[2/3.2] rounded-xl overflow-hidden shadow-md group-hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] transition-all duration-500 bg-secondary relative transform group-hover:-translate-y-2">

                                            {/* Gerçek Kapak */}
                                            {book.cover_url ? (
                                                <img
                                                    src={book.cover_url}
                                                    alt={book.title}
                                                    referrerPolicy="no-referrer"
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        const fallback = "https://images.unsplash.com/photo-1544947950-fa07a98d4679?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                                                        if (target.src !== fallback) {
                                                            target.src = fallback;
                                                        } else {
                                                            target.style.display = 'none';
                                                            target.nextElementSibling?.classList.remove('hidden');
                                                        }
                                                    }}
                                                />
                                            ) : null}

                                            {/* Placeholder (Sadece resim yoksa veya yüklenmezse görünür) */}
                                            <div className={`w-full h-full flex flex-col justify-between p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-white/20 ${book.cover_url ? 'hidden' : 'flex'} absolute inset-0`}>
                                                <div className="w-full h-1 bg-primary/20 rounded-full" />
                                                <div className="text-center">
                                                    <h3 className="font-serif font-bold text-xs leading-tight text-foreground/80 line-clamp-3 mb-1">{cleanTitle(book.title)}</h3>
                                                    <p className="text-[9px] font-sans font-medium text-muted-foreground uppercase tracking-wider line-clamp-1">{cleanAuthor(book.author)}</p>
                                                </div>
                                                <div className="flex justify-center">
                                                    <BookOpen className="h-6 w-6 text-primary/30" />
                                                </div>
                                            </div>

                                            {/* Hover Action: Delete */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full shadow-lg bg-red-500/90 hover:bg-red-600 ring-2 ring-white/20"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (window.confirm('Bu kitabı silmek istediğinize emin misiniz?')) {
                                                            deleteBook(book.id);
                                                            toast.success('Kitap silindi');
                                                        }
                                                    }}
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Reading Progress Overlay (If started) */}
                                            {book.progress && book.progress.percentage > 0 && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/50">
                                                    <div className="h-full bg-primary" style={{ width: `${book.progress.percentage}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Book Info below cover */}
                                    <div className="mt-3 w-full text-center sm:text-left space-y-0.5 px-0.5">
                                        <h3 className="font-bold text-[13px] leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors cursor-pointer" title={book.title}>
                                            <Link to={`/read/${book.id}`}>{cleanTitle(book.title)}</Link>
                                        </h3>
                                        <p className="text-[11px] font-medium text-muted-foreground truncate">{cleanAuthor(book.author)}</p>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-full py-24 text-center">
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/30 mb-6">
                                        <Library className="h-10 w-10 text-muted-foreground/30" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground/80 mb-2">Henüz kitabın yok</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-sm">
                                        Kütüphanen boş görünüyor. Hemen bir EPUB veya PDF yükleyerek okumaya başla.
                                    </p>
                                    <Button
                                        className="rounded-full px-8 shadow-lg shadow-primary/20"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" /> İlk Kitabını Yükle
                                    </Button>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <input type="file" ref={fileInputRef} className="hidden" accept=".epub,.pdf" onChange={handleFileUpload} />
            </div>

            {/* Right Section: Sidebar (User & Stats) */}
            <div className="hidden lg:block w-[300px] space-y-10 animate-in fade-in slide-in-from-right-4 duration-1000">
                {/* Profile Card */}
                <div className="flex items-center gap-4 bg-card/40 p-5 rounded-3xl border border-border/40 shadow-sm backdrop-blur-sm">
                    <Avatar className="h-14 w-14 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'd1'}&backgroundColor=e5e7eb`} />
                        <AvatarFallback>{user?.name?.[0] || 'O'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-foreground/90">{user?.name || 'Misafir Okur'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Çevrimiçi</span>
                        </div>
                    </div>
                </div>

                {/* Simplified Calendar */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Takvim
                        </h2>
                    </div>
                    <Card className="rounded-[2.5rem] border-none bg-card/30 shadow-sm overflow-hidden p-6 ring-1 ring-border/30">
                        <div className="flex justify-between text-center">
                            {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((dayLabel, i) => {
                                const today = new Date();
                                const currentDay = today.getDay(); // 0(Sun) - 6(Sat)
                                const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
                                const date = new Date(today);
                                date.setDate(today.getDate() - mondayOffset + i);

                                const isToday = date.toDateString() === today.toDateString();

                                return (
                                    <div key={i} className="flex flex-col gap-3 items-center">
                                        <span className="text-[9px] text-muted-foreground/60 font-black">{dayLabel}</span>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isToday ? 'bg-primary text-primary-foreground shadow-lg scale-110' : 'text-foreground/70'}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </div>

                {/* Reading Stats Mini */}
                <div className="bg-primary/5 rounded-[2.5rem] p-6 border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Star className="w-32 h-32" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-primary mb-1">Haftalık Hedef</h3>
                    <p className="text-xs text-muted-foreground mb-4">Okuma serini koruyorsun!</p>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold tabular-nums text-foreground/90">3</span>
                        <span className="text-sm font-medium text-muted-foreground mb-1.5">/ 5 Kitap</span>
                    </div>
                    <Progress value={60} className="h-2 bg-primary/10" />
                </div>
            </div>
        </div>
    );
}
