
import { useEffect, useRef } from 'react';
import { useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function LibraryPage() {
    const { books, fetchBooks, uploadBook, loading } = useBookStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBooks();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.epub') && !file.name.endsWith('.pdf')) {
            toast.error('Sadece .epub ve .pdf dosyaları desteklenir.');
            return;
        }

        try {
            toast.info('Kitap yükleniyor...');
            await uploadBook(file, { title: file.name.replace(/\.(epub|pdf)$/i, '') });
            toast.success('Kitap başarıyla eklendi!');
        } catch (error) {
            toast.error('Kitap yüklenirken hata oluştu.');
            console.error(error);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Kütüphanem</h1>
                    <p className="text-muted-foreground">Okumakta olduğunuz ve arşivdeki kitaplarınız.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".epub,.pdf"
                        onChange={handleFileUpload}
                    />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
                        <Plus className="mr-2 h-4 w-4" />
                        Kitap Ekle
                    </Button>
                </div>
            </div>

            {books.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-slate-400">
                    <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Henüz kitabınız yok</h3>
                    <p className="text-sm">Başlamak için yeni bir kitap yükleyin veya Keşfet modunu kullanın.</p>
                    <Button variant="link" onClick={() => fileInputRef.current?.click()} className="mt-2 text-primary">
                        İlk kitabını yükle
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {books.map((book) => (
                        <Link to={`/read/${book.id}`} key={book.id} className="group transition-transform hover:scale-105">
                            <Card className="h-full flex flex-col overflow-hidden border-0 shadow-sm hover:shadow-md bg-slate-50 dark:bg-slate-800">
                                <div className="aspect-[2/3] bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center overflow-hidden">
                                    {book.cover_url ? (
                                        <img src={book.cover_url} alt={book.title} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <BookOpen className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                                            <span className="text-xs text-slate-500 font-mono uppercase">{book.title.slice(0, 2)}</span>
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                    <div>
                                        <h3 className="font-semibold text-sm line-clamp-2 md:text-md" title={book.title}>
                                            {book.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            <span>{book.mode_pref === 'split' ? 'ÇİFT KİTAP' : 'NORMAL'}</span>
                                            <span>%{book.progress.percentage.toFixed(0)}</span>
                                        </div>
                                        <Progress value={book.progress.percentage} className="h-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
