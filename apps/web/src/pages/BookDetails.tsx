import { useParams, Link } from 'react-router-dom';
import { useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Bookmark, Share2, Download, ArrowRight, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { generateDynamicSummary } from '@/lib/metadata-utils';

export default function BookDetails() {
    const { id } = useParams();
    const { books } = useBookStore();
    const book = books.find(b => b.id === id);

    if (!book) return <div className="p-12 text-center text-muted-foreground">Kitap bulunamadı.</div>;

    const summary = generateDynamicSummary(book.title, book.author);

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
            {/* Top Section: Hero */}
            <div className="flex flex-col md:flex-row gap-16 items-start">
                {/* Book Cover with Controls */}
                <div className="flex gap-6 items-center">
                    <div className="flex flex-col gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full border border-border/50 h-10 w-10"><ChevronUp className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-full border border-border/50 h-10 w-10"><ChevronDown className="h-5 w-5" /></Button>
                    </div>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative group"
                    >
                        <div className="w-[300px] aspect-[2/3] rounded-[2rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] group-hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)] transition-all duration-700 bg-secondary">
                            {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-secondary to-muted">
                                    <span className="text-4xl font-serif text-muted-foreground/30">{book.title[0]}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Info Section */}
                <div className="flex-1 space-y-8 pt-8">
                    <div className="space-y-2">
                        <motion.h1
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-6xl font-serif font-medium leading-tight text-foreground"
                        >
                            {book.title}
                        </motion.h1>
                        <p className="text-2xl text-muted-foreground font-serif italic">{book.author}</p>
                    </div>

                    <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                        {summary}
                    </p>

                    <div className="flex items-center gap-6 pt-4">
                        <Link to={`/read/${book.id}`}>
                            <Button className="rounded-2xl h-14 px-10 text-lg font-medium shadow-xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                                Okumaya Başla <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border border-border/50 hover:bg-card transition-colors" title="Favorilere Ekle"><Bookmark className="h-5 w-5" /></Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border border-border/50 hover:bg-card transition-colors" title="Paylaş"><Share2 className="h-5 w-5" /></Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border border-border/50 hover:bg-card transition-colors" title="İndir"><Download className="h-5 w-5" /></Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Details & Friends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 pt-8">
                {/* Description & Comment */}
                <div className="md:col-span-2 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-serif font-semibold">Özet</h3>
                        <div className="space-y-4 text-muted-foreground leading-relaxed">
                            <p>{summary}</p>
                            <p>
                                {book.author !== 'Bilinmiyor' ? `${book.author} tarafından kurgulanan bu eser, ` : 'Bu eser, '}
                                sürükleyici yapısı ve etkileyici karakter gelişimiyle dikkat çekiyor.
                                Okuyucuyu ilk sayfadan itibaren merak uyandıran bir atmosferin içine çeken kitap,
                                türün meraklıları için kaçırılmaması gereken bir deneyim sunuyor.
                            </p>
                        </div>
                    </div>

                    <div className="bg-card/30 p-8 rounded-[2.5rem] border border-border/30 space-y-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=Reader123`} />
                                <AvatarFallback>OK</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-semibold">Aktif Okur</p>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-3 w-3 text-yellow-500 fill-yellow-500" />)}
                                </div>
                            </div>
                        </div>
                        <p className="text-muted-foreground italic leading-relaxed">
                            "Bu kitabı bir solukta bitirdim. Karakterlerin derinliği ve hikayenin akıcılığı muazzam. Kesinlikle kütüphanenizde bulunmalı."
                        </p>
                    </div>
                </div>

                {/* Metadata Column */}
                <div className="space-y-10">
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Yazar Bilgisi</p>
                            <p className="text-foreground font-medium">{book.author}</p>
                        </div>
                        {book.publisher && (
                            <div>
                                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Yayınevi</p>
                                <p className="text-foreground font-medium">{book.publisher}</p>
                            </div>
                        )}
                        {book.year && (
                            <div>
                                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Basım Yılı</p>
                                <p className="text-foreground font-medium">{book.year}</p>
                            </div>
                        )}
                        {book.isbn && (
                            <div>
                                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">ISBN</p>
                                <p className="text-foreground font-medium font-mono text-xs">{book.isbn}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Dil ve Format</p>
                            <p className="text-foreground font-medium">Türkçe, {book.title.endsWith('.pdf') ? 'PDF' : 'EPUB'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Okuma Durumu</p>
                            <p className="text-foreground font-medium">%{book.progress?.percentage.toFixed(0) || 0} tamamlandı</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
