
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Download, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { searchBooks, SearchResult } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { useBookStore } from '@/stores/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/translations';

export default function DiscoverPage() {
    const { uploadBook, settings } = useBookStore();
    const t = useTranslation(settings.language);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!query.trim()) return;

        console.log("Discover Search Started:", query);
        setLoading(true);
        try {
            const data = await searchBooks(query);
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

    const startDownload = async (book: SearchResult) => {
        setSelectedBook(book);
        setIsDialogOpen(true);
    };

    const handleDialogChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setTimeout(() => setSelectedBook(null), 300);
        }
    };

    const confirmDownload = async () => {
        if (!selectedBook) return;

        setIsDialogOpen(false);
        const toastId = toast.loading(`${selectedBook.title} ${t('downloading')} %0`);

        try {
            await new Promise(r => setTimeout(r, 1000));
            toast.loading(`${selectedBook.title} ${t('downloading')} %45`, { id: toastId });

            await new Promise(r => setTimeout(r, 1000));

            // DEMO: Gerçek EPUB indiriliyor (Alice in Wonderland)
            const sampleEpubUrl = 'https://react-reader.metabits.no/files/alice.epub';
            const response = await fetch(sampleEpubUrl);
            const blob = await response.blob();

            const file = new File([blob], `${selectedBook.title}.epub`, { type: 'application/epub+zip' });

            toast.loading(`${selectedBook.title} ${t('processingLibrary')}`, { id: toastId });

            await uploadBook(file, {
                title: selectedBook.title,
                author: selectedBook.author,
                cover_url: selectedBook.cover_url
            });

            toast.success(t('bookAdded'), { id: toastId });
        } catch (e) {
            toast.error(t('downloadFailed'), { id: toastId });
            console.error(e);
        } finally {
            setTimeout(() => setSelectedBook(null), 300);
        }
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
                {results.map((book) => (
                    <motion.div
                        key={book.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5 }}
                        className="group relative bg-card/40 backdrop-blur-sm border border-border/30 rounded-[2.5rem] p-6 hover:bg-card/60 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5"
                    >
                        <div className="flex gap-6 items-start">
                            <div className="h-40 w-28 bg-secondary/50 shrink-0 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-primary/10 transition-shadow bg-muted">
                                {book.cover_url ? (
                                    <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                                        <div className="text-center p-2">
                                            <div className="text-[10px] uppercase font-bold mb-1 opacity-50">{t('noCover')}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                <h3 className="font-serif font-bold text-xl leading-tight text-foreground/90 group-hover:text-primary transition-colors line-clamp-2">{book.title}</h3>
                                <p className="text-sm font-medium text-muted-foreground/80 truncate">{book.author}</p>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {book.publisher && <span className="bg-primary/5 text-primary/70 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg truncate max-w-[150px]">{book.publisher}</span>}
                                    {book.isbn && <span className="bg-secondary text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">{t('isbn')}: {book.isbn}</span>}
                                </div>

                                <div className="flex gap-2 mt-4 pt-4 border-t border-border/20 flex-wrap">
                                    <Button size="sm" className="rounded-xl flex-1 h-9 font-bold tracking-tight text-xs shadow-md shadow-primary/10" onClick={() => startDownload(book)}>
                                        <Download className="h-3.5 w-3.5 mr-2" />
                                        {t('addDemo')}
                                    </Button>

                                    {book.externalLinks && (
                                        <>
                                            <Button size="sm" variant="outline" asChild className="rounded-xl h-9 px-3 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 text-xs font-semibold bg-white/50 hover:bg-white">
                                                <a href={book.externalLinks.annasArchive} target="_blank" rel="noreferrer" title={t('searchAnnasArchive')}>
                                                    Anna's
                                                    <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                                                </a>
                                            </Button>
                                            <Button size="sm" variant="outline" asChild className="rounded-xl h-9 px-3 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 text-xs font-semibold bg-white/50 hover:bg-white">
                                                <a href={book.externalLinks.libgen} target="_blank" rel="noreferrer" title={t('searchLibgen')}>
                                                    Libgen
                                                    <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                                                </a>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {results.length === 0 && !loading && query && (
                <div className="text-center py-20 bg-secondary/20 rounded-[3rem] border-2 border-dashed border-border/50">
                    <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">{t('noBooksFound')}</p>
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-md bg-background/95 backdrop-blur-xl">
                    <DialogHeader className="space-y-4">
                        <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-2xl font-serif text-center">{t('downloadWarning')}</DialogTitle>
                        <DialogDescription className="text-center text-sm font-sans space-y-2 text-muted-foreground">
                            <p>
                                {t('currentlyReading')} <strong>{t('demoModeTitle')}</strong>. {t('downloadWarningDesc')}
                                <span className="font-bold text-foreground mx-1">"{selectedBook?.title}"</span>
                            </p>
                            <div className="bg-secondary/50 p-3 rounded-xl text-xs mt-4">
                                <p className="font-semibold text-foreground">{t('downloadExampleTitle')}</p>
                                <p>{t('downloadExampleBook')}</p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center flex-col sm:flex-row gap-2 mt-6">
                        <Button variant="ghost" className="rounded-2xl px-8 h-12 font-bold hover:bg-secondary" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                        <Button className="rounded-2xl px-8 h-12 font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white" onClick={confirmDownload}>{t('confirmDownload')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Helper icons (eğer başka yerde import edilmediyse)
// ... (Mevcut kodda importların çalıştığını varsayıyorum, eğer hata alırsam eklerim)
