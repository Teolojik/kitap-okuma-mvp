
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/useStore';
import { MockAPI, Book } from '@/lib/mock-api';
import EpubReader from '@/components/reader/EpubReader';
import PdfReader from '@/components/reader/PdfReader';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, ArrowLeft, BookOpen, Columns, Maximize, ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ReaderPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { books, settings, setSettings, updateProgress } = useBookStore();

    const [book, setBook] = useState<Book | null>(null);
    const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Split Screen State
    const { secondaryBookId, setSecondaryBookId } = useBookStore();
    const [secondaryBook, setSecondaryBook] = useState<Book | null>(null);
    const [secondaryBookData, setSecondaryBookData] = useState<string | ArrayBuffer | null>(null);

    useEffect(() => {
        if (!id) return;
        loadBook(id, setBook, setBookData);
    }, [id]);

    useEffect(() => {
        if (settings.readingMode === 'split' && secondaryBookId) {
            loadBook(secondaryBookId, setSecondaryBook, setSecondaryBookData);
        }
    }, [settings.readingMode, secondaryBookId]);

    const loadBook = async (bookId: string, setMeta: any, setData: any) => {
        setIsLoading(true);
        try {
            // Metadata might be in store, but data needs fetching
            const meta = books.find(b => b.id === bookId) || (await MockAPI.books.list()).find(b => b.id === bookId);
            if (!meta) throw new Error('Kitap bulunamadı');
            setMeta(meta);

            // Fetch Blob
            const blob = await MockAPI.books.getFileBlob(bookId);
            if (!blob) throw new Error('Dosya yüklenemedi');

            const arrayBuffer = await blob.arrayBuffer();
            setData(arrayBuffer);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocationChange = (loc: string, percentage: number) => {
        if (!book) return;
        updateProgress(book.id, { ...book.progress, percentage: percentage * 100, location: loc });
    };

    if (isLoading && !book) {
        return <div className="h-screen flex items-center justify-center">Kitap yükleniyor...</div>;
    }

    if (!book || !bookData) {
        return <div className="h-screen flex flex-col items-center justify-center gap-4">
            <p>Kitap açılamadı.</p>
            <Button onClick={() => navigate('/')}>Kütüphaneye Dön</Button>
        </div>;
    }

    const renderReader = (
        b: Book,
        data: string | ArrayBuffer,
        isSecondary = false
    ) => {
        const isPdf = b.title.endsWith('.pdf') || (typeof (b.file_url) === 'string' && b.file_url.endsWith('.pdf')); // Simple check

        if (isPdf) return <PdfReader url="mock-url" />; // Fix later

        return <EpubReader
            url={data}
            initialLocation={b.progress?.location as string}
            onLocationChange={!isSecondary ? handleLocationChange : undefined}
            isSplit={settings.readingMode === 'split'}
        />;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top Bar */}
            <div className="h-12 border-b bg-background flex items-center justify-between px-4 shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold truncate max-w-[200px]">{book.title}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">Font Boyutu</h3>
                                    <Slider
                                        defaultValue={[settings.fontSize]}
                                        max={200} min={50} step={10}
                                        onValueChange={(v) => setSettings({ fontSize: v[0] })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">Tema</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant={settings.theme === 'light' ? 'default' : 'outline'} onClick={() => setSettings({ theme: 'light' })}>Açık</Button>
                                        <Button size="sm" variant={settings.theme === 'sepia' ? 'default' : 'outline'} onClick={() => setSettings({ theme: 'sepia' })}>Sepya</Button>
                                        <Button size="sm" variant={settings.theme === 'dark' ? 'default' : 'outline'} onClick={() => setSettings({ theme: 'dark' })}>Koyu</Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">Okuma Modu</h3>
                                    <div className="flex flex-col gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between">
                                                    {settings.readingMode === 'single' && <> <div className="flex items-center"><Maximize className="mr-2 h-4 w-4" /> Tek Sayfa</div> </>}
                                                    {settings.readingMode === 'double-animated' && <> <div className="flex items-center"><BookOpen className="mr-2 h-4 w-4" /> Çift (Animasyonlu)</div> </>}
                                                    {settings.readingMode === 'double-static' && <> <div className="flex items-center"><BookOpen className="mr-2 h-4 w-4" /> Çift (Statik)</div> </>}
                                                    {settings.readingMode === 'split' && <> <div className="flex items-center"><Columns className="mr-2 h-4 w-4" /> Çift Kitap (Split)</div> </>}
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-[200px]">
                                                <DropdownMenuItem onClick={() => setSettings({ readingMode: 'single' })}>
                                                    <Maximize className="mr-2 h-4 w-4" /> Tek Sayfa
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSettings({ readingMode: 'double-animated' })}>
                                                    <BookOpen className="mr-2 h-4 w-4" /> Çift (Animasyonlu)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSettings({ readingMode: 'double-static' })}>
                                                    <BookOpen className="mr-2 h-4 w-4" /> Çift (Statik)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSettings({ readingMode: 'split' })}>
                                                    <Columns className="mr-2 h-4 w-4" /> Çift Kitap (Split)
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {settings.readingMode === 'split' && (
                                    <div className="space-y-2 border-t pt-4">
                                        <h3 className="text-sm font-medium">İkinci Kitap</h3>
                                        <p className="text-xs text-muted-foreground">Sağ tarafta açılacak kitabı seçin.</p>
                                        <div className="max-h-[200px] overflow-auto space-y-1">
                                            {books.filter(b => b.id !== book.id).map(b => (
                                                <Button
                                                    key={b.id}
                                                    variant={secondaryBookId === b.id ? 'secondary' : 'ghost'}
                                                    size="sm"
                                                    className="w-full justify-start text-xs truncate"
                                                    onClick={() => setSecondaryBookId(b.id)}
                                                >
                                                    {b.title}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Reader Content */}
            <div className="flex-1 overflow-hidden relative">
                {settings.readingMode === 'split' ? (
                    <div className="grid grid-cols-2 h-full divide-x">
                        {/* Left Book */}
                        <div className="h-full relative">
                            {renderReader(book, bookData)}
                        </div>
                        {/* Right Book */}
                        <div className="h-full relative bg-slate-100 dark:bg-slate-900">
                            {secondaryBook && secondaryBookData ? (
                                renderReader(secondaryBook, secondaryBookData, true)
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                                    <p className="text-sm text-muted-foreground mb-4">İkinci kitabı seçmek için ayarlar menüsünü kullanın.</p>
                                    <Button variant="outline" size="sm">Ayarları Aç</Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    renderReader(book, bookData)
                )}
            </div>
        </div>
    );
}
