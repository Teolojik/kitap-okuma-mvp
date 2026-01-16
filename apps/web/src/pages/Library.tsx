import { useEffect, useRef, useState } from 'react';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, BookOpen, Search, ArrowRight, Calendar, Users, Star, ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
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
            toast.info('Kitap yükleniyor...');
            const meta = parseBookFilename(file.name);
            await uploadBook(file, meta);
            toast.success('Kitap başarıyla eklendi!');
        } catch (error) {
            toast.error('Yükleme başarısız.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const latestBook = filteredBooks.length > 0 ? filteredBooks[0] : null;

    return (
        <div className="flex flex-col lg:flex-row gap-12 pb-20 lg:pb-0">
            {/* Left Section: Main Content */}
            <div className="flex-1 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Search Bar */}
                <div className="relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Kitaplığında ara..."
                        className="w-full bg-card/50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm placeholder:text-muted-foreground/60 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Greeting & Hero */}
                <div className="space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-5xl font-serif font-medium leading-tight text-foreground/90"
                    >
                        Gününüz nasıl geçiyor,<br />{user?.name?.split(' ')[0] || 'Okur'}?
                    </motion.h1>
                    <p className="text-muted-foreground text-lg max-w-lg leading-relaxed font-sans">
                        Kaldığınız yerden devam etmeye ne dersiniz? En son okuduğunuz kitap sizi bekliyor.
                    </p>
                    <div className="flex gap-4 pt-2">
                        {latestBook && (
                            <Link to={`/read/${latestBook.id}`}>
                                <Button className="rounded-2xl h-14 px-8 text-lg font-medium shadow-xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                                    Okumaya Devam Et <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="secondary"
                            className="rounded-2xl h-14 px-8 text-lg font-medium border-none bg-card/50 hover:bg-card/80 transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Plus className="mr-2 h-5 w-5" /> Kitap Yükle
                        </Button>
                    </div>
                </div>

                {/* Popular Now - Horizontal Scroll */}
                <section className="space-y-6">
                    <div className="flex justify-between items-end">
                        <h2 className="text-2xl font-serif font-semibold">Senin İçin Seçtiklerimiz</h2>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 border border-border/50"><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 border border-border/50"><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 mask-fade-right">
                        {filteredBooks.length > 0 ? filteredBooks.map((book) => (
                            <motion.div
                                key={book.id}
                                whileHover={{ y: -10 }}
                                className="min-w-[180px] group cursor-pointer"
                            >
                                <Link to={`/book/${book.id}`}>
                                    <div className="aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-all duration-500 bg-secondary relative">
                                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8 rounded-full shadow-lg"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (window.confirm('Bu kitabı silmek istediğinize emin misiniz?')) {
                                                        deleteBook(book.id);
                                                        toast.success('Kitap silindi');
                                                    }
                                                }}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {book.cover_url ? (
                                            <img
                                                src={book.cover_url}
                                                alt={book.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                onError={(e) => {
                                                    // Fallback to placeholder if image fails
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}

                                        {/* Placeholder if no cover or error */}
                                        <div className={`w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/80 to-primary/40 text-primary-foreground ${book.cover_url ? 'hidden' : ''} absolute top-0 left-0`}>
                                            <BookOpen className="h-12 w-12 text-white/50 mb-4" />
                                            <h3 className="font-serif font-bold text-center leading-tight mb-2 text-white drop-shadow-md line-clamp-3">{book.title}</h3>
                                            <p className="text-xs font-sans text-white/80 uppercase tracking-widest text-center">{book.author}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{cleanTitle(book.title)}</h3>
                                        <p className="text-xs text-muted-foreground">{cleanAuthor(book.author)}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        )) : (
                            <div className="w-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-[2.5rem] bg-secondary/10">
                                <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                <p>Aradığınız kitap bulunamadı.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Internal Hidden Input */}
                <input type="file" ref={fileInputRef} className="hidden" accept=".epub,.pdf" onChange={handleFileUpload} />
            </div>

            {/* Right Section: Sidebar Widgets */}
            <div className="w-full lg:w-[320px] space-y-12 animate-in fade-in slide-in-from-right-4 duration-1000">
                {/* User Stats/Profile mini */}
                <div className="flex items-center gap-4 bg-card/30 p-4 rounded-3xl border border-border/30">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`} />
                        <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="text-sm font-semibold">{user?.name || 'Değerli Okur'}</p>
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Aktif Üyelik</span>
                        </div>
                    </div>
                </div>

                {/* Schedule Reading */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-serif font-semibold">Okuma Takvimi</h2>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                    <Card className="rounded-[2.5rem] border-none bg-card/50 shadow-sm overflow-hidden p-6">
                        <div className="flex justify-between text-center pb-2">
                            {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((day, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <span className="text-[10px] text-muted-foreground font-bold">{day}</span>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${i === new Date().getDay() - 1 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-secondary'}`}>
                                        {new Date().getDate() - (new Date().getDay() - 1) + i}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Reader Friends */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-serif font-semibold">Topluluk Hareketleri</h2>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-border/50">
                        {[
                            { name: 'Cem Ömer', action: 'Harika bir eser!', book: 'Simyacı', time: 'Az önce' },
                            { name: 'Elif Yılmaz', action: 'Farklı bir bakış açısı.', book: 'Kürk Mantolu Madonna', time: '12 dk önce' }
                        ].map((friend, i) => (
                            <div key={i} className="flex gap-4 relative">
                                <Avatar className="h-12 w-12 border-4 border-background z-10 shadow-sm">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${friend.name}`} />
                                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 pt-1">
                                    <p className="text-sm font-semibold">{friend.name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                                        "{friend.action}" <span className="text-primary/80 font-medium">@{friend.book}</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-2">{friend.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
