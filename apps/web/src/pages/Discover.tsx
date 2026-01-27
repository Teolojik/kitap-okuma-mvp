
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { searchBooks, SearchResult } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { useBookStore } from '@/stores/useStore';

import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/translations';
import { BookCover } from '@/components/ui/BookCover';

export default function DiscoverPage() {
    const { settings } = useBookStore();
    const t = useTranslation(settings.language);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);


    const categories = [
        { name: "Classics", query: "subject:classics", icon: "🏛️" },
        { name: "Philosophy", query: "subject:philosophy", icon: "🧠" },
        { name: "Sci-Fi", query: "subject:science fiction", icon: "🚀" },
        { name: "History", query: "subject:history", icon: "📜" },
        { name: "Art", query: "subject:art", icon: "🎨" },
        { name: "Self-Help", query: "subject:self-help", icon: "✨" }
    ];

    const handleCategoryClick = (catQuery: string) => {
        setQuery(catQuery.replace('subject:', ''));
        performSearch(catQuery);
    };

    const performSearch = async (searchQuery: string) => {
        console.log("Discover Search Started:", searchQuery);
        setLoading(true);
        try {
            const data = await searchBooks(searchQuery);
            console.log("Discover Results Received:", data.length);
            setResults(data);
            if (data.length === 0) toast(t('noResultsFound'));
        } catch (error) {
            console.error("Discover Search Error:", error);
            toast.error(t('connectionError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!query.trim()) return;
        performSearch(query);
    };



    return (
        <div className="space-y-12 max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
            <div className="text-center space-y-4 py-8">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-serif font-medium text-foreground/90"
                >
                    {t('discoverTitle')}
                </motion.h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-sans">
                    {t('discoverSub')}
                </p>
            </div>

            <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder={t('discoverSearchPlaceholder')}
                    className="w-full bg-card/50 border-none rounded-[2rem] py-6 pl-16 pr-6 focus:ring-4 focus:ring-primary/10 transition-all outline-none text-lg shadow-xl shadow-black/5"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[1.5rem] h-12 px-8 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('search')}
                </Button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                {loading ? (
                    // Skeleton Loaders
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card/40 backdrop-blur-sm border border-border/10 rounded-[2.5rem] p-6 animate-pulse">
                            <div className="flex gap-6 items-start">
                                <div className="h-40 w-28 bg-secondary rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-4">
                                    <div className="h-6 bg-secondary rounded-full w-3/4" />
                                    <div className="h-4 bg-secondary rounded-full w-1/2" />
                                    <div className="space-y-2 pt-4">
                                        <div className="h-8 bg-secondary rounded-xl w-full" />
                                        <div className="h-8 bg-secondary rounded-xl w-1/2" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : results.length > 0 ? (
                    results.map((book) => (
                        <motion.div
                            key={book.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -5 }}
                            className="group relative bg-card/40 backdrop-blur-sm border border-border/30 rounded-[2.5rem] p-6 hover:bg-card/60 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5"
                        >
                            <div className="flex gap-6 items-start">
                                <div className="h-40 w-28 shrink-0 shadow-lg group-hover:shadow-primary/10 transition-shadow">
                                    <BookCover
                                        url={book.cover_url}
                                        title={book.title}
                                        aspectRatio="aspect-[2/3]"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-2 min-w-0">
                                    <h3 className="font-serif font-bold text-xl leading-tight text-foreground/90 group-hover:text-primary transition-colors line-clamp-2">{book.title}</h3>
                                    <p className="text-sm font-medium text-muted-foreground/80 truncate">{book.author}</p>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {book.publisher && <span className="bg-primary/5 text-primary/70 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg truncate max-w-[150px]">{book.publisher}</span>}
                                        {book.isbn && <span className="bg-secondary text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">{t('isbn')}: {book.isbn}</span>}
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/20 flex-wrap">


                                        {book.externalLinks && (
                                            <>
                                                <Button size="sm" variant="outline" asChild className="rounded-xl h-9 px-3 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 text-xs font-semibold bg-white/50 hover:bg-white">
                                                    <a href={book.externalLinks.annasArchive} target="_blank" rel="noreferrer" title={t('searchAnnasArchive')}>
                                                        Anna's
                                                        <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                                                    </a>
                                                </Button>
                                                <Button size="sm" variant="outline" asChild className="rounded-xl h-9 px-3 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 text-xs font-semibold bg-white/50 hover:bg-white flex-1">
                                                    <a href={book.externalLinks.annasArchive} target="_blank" rel="noreferrer" title={t('searchAnnasArchive')}>
                                                        Anna's
                                                        <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                                                    </a>
                                                </Button>
                                                <Button size="sm" variant="outline" asChild className="rounded-xl h-9 px-3 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 text-xs font-semibold bg-white/50 hover:bg-white flex-1">
                                                    <a href={book.externalLinks.libgen} target="_blank" rel="noreferrer" title={t('searchLibgen')}>
                                                        Libgen
                                                        <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                                                    </a>
                                                </Button>
                                                <Button size="sm" variant="outline" asChild className="rounded-xl h-9 px-3 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 text-xs font-semibold bg-white/50 hover:bg-white flex-1">
                                                    <a href={book.externalLinks.welib} target="_blank" rel="noreferrer" title="Welib">
                                                        Welib
                                                        <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                                                    </a>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-12">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    onClick={() => handleCategoryClick(cat.query)}
                                    className="group p-6 rounded-[2rem] bg-card/40 border border-border/30 hover:border-primary/50 hover:bg-card/80 transition-all hover:scale-105"
                                >
                                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{cat.name}</span>
                                </button>
                            ))}
                        </div>

                        {!query && (
                            <div className="bg-secondary/20 p-12 rounded-[3.5rem] border border-dashed border-border/50">
                                <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground text-sm font-medium">{t('discoverSub')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>


        </div>
    );
}

// Helper icons (eğer başka yerde import edilmediyse)
// ... (Mevcut kodda importların çalıştığını varsayıyorum, eğer hata alırsam eklerim)
