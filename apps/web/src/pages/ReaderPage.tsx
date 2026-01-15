
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/useStore';
import { MockAPI, Book } from '@/lib/mock-api';
import ReaderContainer from '@/components/reader/ReaderContainer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, ArrowLeft, BookOpen, Columns, Maximize, ChevronDown, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
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

    const [selection, setSelection] = useState<{ cfi: string; text: string } | null>(null);

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
                    {/* Mode Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Okuma Modu">
                                {settings.readingMode === 'single' && <Maximize className="h-5 w-5" />}
                                {settings.readingMode === 'double-animated' && <BookOpen className="h-5 w-5" />}
                                {settings.readingMode === 'double-static' && <BookOpen className="h-5 w-5 opacity-70" />}
                                {settings.readingMode === 'split' && <Columns className="h-5 w-5" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
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

                                <div className="space-y-2 border-t pt-4">
                                    <h3 className="text-sm font-medium">Yer İmleri</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => {
                                            if (book) {
                                                useBookStore.getState().addBookmark(book.id, String(book.progress?.location || '0'), `Sayfa ${book.progress?.page}`);
                                                toast.success('Yer imi eklendi');
                                            }
                                        }}>
                                            <BookmarkPlus className="h-4 w-4 mr-2" /> Ekle
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-1 mt-2 max-h-[150px] overflow-auto">
                                    {(useBookStore.getState().bookmarks[book?.id || ''] || []).map((bm: any) => (
                                        <div key={bm.id} className="flex items-center justify-between text-xs p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                            <span>{bm.note || 'Yer İmi'}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => {
                                                if (book) useBookStore.getState().removeBookmark(book.id, bm.id);
                                            }}>
                                                &times;
                                            </Button>
                                        </div>
                                    ))}
                                    {(useBookStore.getState().bookmarks[book?.id || ''] || []).length === 0 && (
                                        <p className="text-xs text-muted-foreground">Henüz yer imi yok.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <h3 className="text-sm font-medium">Notlar & Çizimler</h3>
                                <div className="space-y-1 mt-2 max-h-[150px] overflow-auto">
                                    {(useBookStore.getState().annotations[book?.id || ''] || []).map((ant: any) => (
                                        <div key={ant.id} className="text-xs p-2 bg-slate-100 dark:bg-slate-900 rounded space-y-1">
                                            <div className="flex justify-between items-start">
                                                <span className="font-semibold text-[10px] uppercase text-yellow-600">{ant.type}</span>
                                                <Button size="icon" variant="ghost" className="h-4 w-4 text-red-500" onClick={() => {
                                                    if (book) useBookStore.getState().removeAnnotation(book.id, ant.id);
                                                }}>
                                                    &times;
                                                </Button>
                                            </div>
                                            <p className="italic border-l-2 border-yellow-400 pl-2 opacity-80 line-clamp-2">"{ant.text}"</p>
                                            {ant.note && <p className="font-medium text-blue-600 dark:text-blue-400">Not: {ant.note}</p>}
                                        </div>
                                    ))}
                                    {(useBookStore.getState().annotations[book?.id || ''] || []).length === 0 && (
                                        <p className="text-xs text-muted-foreground">Henüz not yok.</p>
                                    )}
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

            {/* Reader Content */ }
    <ReaderContainer
        book={book}
        data={bookData}
        secondaryBook={secondaryBook}
        secondaryData={secondaryBookData}
        onLocationChange={handleLocationChange}
        onTextSelected={(cfi, text) => {
            // For MVP, we use a simple dialog or bottom sheet triggered by selection
            // Or we can save internal state "selection" and show a UI
            // Using a simple state for now
            setSelection({ cfi, text });
        }}
        annotations={useBookStore.getState().annotations[book.id] || []}
    />

    {/* Selection Action Bar (Mobile/Desktop friendly floating bar) */ }
    {
        selection && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-lg shadow-xl flex items-center gap-2 z-50 animate-in slide-in-from-bottom-2">
                <span className="text-xs max-w-[100px] truncate mr-2 opacity-70">{selection.text}</span>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => {
                    useBookStore.getState().addAnnotation(book.id, { cfiRange: selection.cfi, text: selection.text, color: 'yellow', type: 'highlight' });
                    setSelection(null);
                    toast.success("Altı çizildi");
                }}>
                    <div className="h-3 w-3 bg-yellow-400 rounded-full mr-1" /> Çiz
                </Button>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => {
                    const note = prompt("Notunuz:");
                    if (note) {
                        useBookStore.getState().addAnnotation(book.id, { cfiRange: selection.cfi, text: selection.text, note, color: 'yellow', type: 'note' });
                        setSelection(null);
                        toast.success("Not eklendi");
                    }
                }}>
                    Not Ekle
                </Button>
                <div className="w-px h-4 bg-white/20" />
                <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/20" onClick={() => setSelection(null)}>
                    &times;
                </Button>
            </div>
        )
    }
        </div >
        </div >
    );
}
