
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { searchBooks, SearchResult } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { useBookStore } from '@/stores/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function DiscoverPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null); // For legal modal
    const { uploadBook } = useBookStore();

    // State for dialog open to prevent content disappearing during animation
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const data = await searchBooks(query);
            setResults(data);
            if (data.length === 0) toast('Sonuç bulunamadı.');
        } catch (error) {
            toast.error('Arama sırasında hata oluştu.');
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
        // Only clear selected book after animation (timeout) or if opening new one
        if (!open) {
            setTimeout(() => setSelectedBook(null), 300);
        }
    };

    const confirmDownload = async () => {
        if (!selectedBook) return;

        toast.info(`${selectedBook.title} indiriliyor...`);
        // Simulate download and add to library
        try {
            // Create a dummy blob
            const dummyContent = new Blob(["Mock Book Content"], { type: 'application/epub+zip' });
            const file = new File([dummyContent], `${selectedBook.title}.${selectedBook.format}`, { type: 'application/epub+zip' });

            await new Promise(r => setTimeout(r, 2000)); // Fake download time
            await uploadBook(file, {
                title: selectedBook.title,
                author: selectedBook.author,
                cover_url: selectedBook.cover_url
            });

            toast.success('Kitap kütüphanenize eklendi!');
        } catch (e) {
            toast.error('İndirme başarısız.');
        } finally {
            setIsDialogOpen(false);
            // Timeout handled by effect or simple close logic above, 
            // but since we close programmatically here:
            setTimeout(() => setSelectedBook(null), 300);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Kitap Keşfet</h1>
                <p className="text-muted-foreground">Anna's Archive ve Libgen üzerinden milyonlarca kitaba erişin.</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder="Kitap adı, yazar veya ISBN..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Aranıyor...' : 'Ara'}
                </Button>
            </form>

            <div className="space-y-4">
                {results.map((book) => (
                    <Card key={book.id} className="overflow-hidden">
                        <CardContent className="p-4 flex gap-4">
                            <div className="h-24 w-16 bg-slate-200 shrink-0 rounded overflow-hidden">
                                {book.cover_url && <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-1">
                                <h3 className="font-semibold text-lg">{book.title}</h3>
                                <p className="text-sm text-muted-foreground">{book.author}</p>
                                <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">{book.source}</span>
                                    <span className="uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">{book.format}</span>
                                    <span>{book.size}</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                                <Button size="sm" onClick={() => startDownload(book)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    İndir
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
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
                        <DialogDescription className="pt-2">
                            Bu kitabı indirmek üzeresiniz. Lütfen indirdiğiniz içeriğin telif haklarına uygun olduğundan ve kişisel kullanım sınırları dahilinde kaldığından emin olun.
                            <br /><br />
                            <strong>Kitap:</strong> {selectedBook?.title}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button onClick={confirmDownload}>Onaylıyorum ve İndir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
