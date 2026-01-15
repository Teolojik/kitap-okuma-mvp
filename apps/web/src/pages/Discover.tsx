
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Download, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { searchBooks, SearchResult } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { useBookStore } from '@/stores/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function DiscoverPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);
    const { uploadBook } = useBookStore();

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        // Simulate fetch from multiple sources
        // In real world: props to real API endpoints
        // Here we stick to refined mock service which now simulates "fetching"
        try {
            const data = await searchBooks(query);
            setResults(data);
            if (data.length === 0) toast('Sonuç bulunamadı. Lütfen ISBN veya tam ad deneyin.');
        } catch (error) {
            toast.error('Bağlantı hatası.');
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
        const toastId = toast.loading(`${selectedBook.title} indiriliyor... %0`);

        try {
            // 1. Fetch File (Simulation)
            // In a real scenario we would fetch(selectedBook.downloadUrl) via proxy
            // Mocking the progress
            await new Promise(r => setTimeout(r, 1000));
            toast.loading(`${selectedBook.title} indiriliyor... %45`, { id: toastId });

            await new Promise(r => setTimeout(r, 1000));
            const dummyContent = new Blob(["Simulated Content for " + selectedBook.title], { type: 'application/epub+zip' });
            const file = new File([dummyContent], `${selectedBook.title}.${selectedBook.format}`, { type: 'application/epub+zip' });

            toast.loading(`${selectedBook.title} kütüphaneye işleniyor...`, { id: toastId });

            // 2. Upload to Supabase/Store
            await uploadBook(file, {
                title: selectedBook.title,
                author: selectedBook.author,
                cover_url: selectedBook.cover_url
            });

            toast.success('Kitap başarıyla eklendi!', { id: toastId });
        } catch (e) {
            toast.error('İndirme başarısız oldu.', { id: toastId });
            console.error(e);
        } finally {
            setTimeout(() => setSelectedBook(null), 300);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Kitap Keşfet</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Anna's Archive ve LibGen veritabanlarında arama yapın,
                    kitapları saniyeler içinde kütüphanenize indirin.
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        className="pl-10 h-12 text-lg"
                        placeholder="Kitap adı, yazar, ISBN..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <Button type="submit" size="lg" disabled={loading} className="px-8">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ara'}
                </Button>
            </form>

            <div className="space-y-4 mt-8">
                {results.map((book) => (
                    <Card key={book.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                        <CardContent className="p-4 flex gap-4 items-start">
                            <div className="h-32 w-24 bg-slate-200 shrink-0 rounded-md overflow-hidden shadow-sm">
                                {book.cover_url ? (
                                    <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-100">
                                        <BookOpen className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <h3 className="font-bold text-xl leading-tight group-hover:text-blue-600 transition-colors">{book.title}</h3>
                                <p className="text-base text-muted-foreground">{book.author}</p>
                                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500 mt-2">
                                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{book.source}</span>
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">{book.format}</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">{book.size}</span>
                                    {book.language && <span className="bg-slate-100 px-2 py-0.5 rounded uppercase">{book.language}</span>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <Button size="sm" onClick={() => startDownload(book)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    İndir
                                </Button>
                                <Button size="sm" variant="ghost" asChild className="text-muted-foreground">
                                    <a href={book.downloadUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Yasal Uyarı
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-base">
                            Bu kitabı <strong>Anna's Archive / LibGen</strong> kaynağından indirmek üzeresiniz.
                            <br /><br />
                            Lütfen telif haklarına ve ülkenizdeki yasal düzenlemelere uygun hareket ettiğinizden emin olun.
                            Sorumluluk tamamen kullanıcıya aittir.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={confirmDownload}>Onaylıyorum ve İndir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Helper icon
function BookOpen(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    )
}
