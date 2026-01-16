
import { findCoverImage } from './discovery-service';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils';

export interface Book {
    id: string;
    user_id: string;
    title: string;
    author: string;
    file_url: string;
    cover_url?: string;
    publisher?: string;
    year?: string;
    isbn?: string;
    progress: {
        percentage: number;
        location?: string | number;
        page: number;
    };
    last_read: string;
    mode_pref: 'single' | 'double' | 'split';
    format: 'epub' | 'pdf';
    created_at: string;
}

const DB_NAME = 'KitapOkumaDB';
const STORE_NAME = 'books_files';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveFile = async (id: string, file: Blob): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(file, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getFile = async (id: string): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const deleteFile = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const smartClean = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\.(pdf|epub|mobi)$/i, '')
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\(.*?\)/g, '')
        .replace(/\b(indir|download|full|tam|surum|baski|edition)\b/gi, '')
        .trim();
};

// Zeki İsim Ayrıştırıcı (Dosya Adından Yazar/Kitap Bulma)
const parseFileName = (fileName: string) => {
    // Örnek: "Talha Uğurluel - Kudüs.pdf"
    // Tire varsa, tireden öncesi yazar, sonrası kitap (veya tam tersi) olabilir.
    // Genellikle: Yazar - Kitap veya Kitap - Yazar
    const parts = fileName.replace(/\.(pdf|epub|mobi)$/i, '').split(/\s*-\s*/);

    if (parts.length >= 2) {
        // En uzun parça kitap adı, en kısa parça yazar adıdır (genellikle)
        // Ama "Talha Uğurluel" (2 kelime) ve "Kudüs" (1 kelime). Yazar genelde 2-3 kelime olur.
        // Basit bir varsayım yapalım: İlk parça Yazar olabilir mi?
        const p1 = smartClean(parts[0]);
        const p2 = smartClean(parts[1]);

        // Eğer ilk parça 2-3 kelime ise ve "Library" gibi yasaklı kelime değilse, yazar kabul et.
        if (p1.split(' ').length <= 3 && !p1.toUpperCase().includes('LIBRARY')) {
            return { author: p1, title: p2 };
        }
    }
    return null;
};

export const MockAPI = {
    auth: {
        signIn: async () => {
            await new Promise(r => setTimeout(r, 500));
            const user = { id: 'mock-user-1', email: 'user@example.com', name: 'Demo Kullanıcı' };
            localStorage.setItem('auth_user', JSON.stringify(user));
            return { data: { user }, error: null };
        },
        signOut: async () => {
            localStorage.removeItem('auth_user');
            return { error: null };
        },
        getUser: () => {
            const u = localStorage.getItem('auth_user');
            return u ? JSON.parse(u) : null;
        }
    },

    books: {
        list: async (): Promise<Book[]> => {
            await new Promise(r => setTimeout(r, 800));
            const stored = localStorage.getItem('mock_books');
            return stored ? JSON.parse(stored) : [];
        },

        delete: async (bookId: string) => {
            await new Promise(r => setTimeout(r, 500));
            await deleteFile(bookId);
            const books = await MockAPI.books.list();
            const newBooks = books.filter(b => b.id !== bookId);
            localStorage.setItem('mock_books', JSON.stringify(newBooks));
        },

        upload: async (file: File, metadata: Partial<Book>) => {
            await new Promise(r => setTimeout(r, 1000));
            const id = crypto.randomUUID();
            const user = MockAPI.auth.getUser();

            const format = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'epub';

            const gradients = [
                'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop',
                'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=600&fit=crop',
                'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400&h=600&fit=crop'
            ];
            const randomCover = gradients[Math.floor(Math.random() * gradients.length)];

            // METADATA İYİLEŞTİRME (Yazar/Başlık Ayrıştırma)
            let finalTitle = metadata.title || file.name;
            let finalAuthor = metadata.author || 'Bilinmiyor';

            // Eğer yazar bilgisi kötü ise (Library, Unknown, Admin, boş)
            const badAuthors = ['LIBRARY', 'UNKNOWN', 'ADMIN', 'BILINMIYOR', 'ANONIM', ''];
            if (badAuthors.some(bad => finalAuthor.toUpperCase().includes(bad))) {
                console.log("Bad author detected:", finalAuthor, "Trying to parse filename...");
                const parsed = parseFileName(file.name);
                if (parsed) {
                    finalTitle = parsed.title;
                    finalAuthor = parsed.author;
                    console.log("Parsed from filename:", parsed);
                }
            }

            // OTO-KAPAK STRATEJİSİ
            let finalCover = metadata.cover_url;
            if (!finalCover) {
                try {
                    const cleanName = smartClean(finalTitle);
                    const cleanAuth = smartClean(finalAuthor);

                    // 1. Kısa Başlık + Yazar (En Güçlü Arama)
                    // "Ezbere Yaşayanlar Vazgeçemediğimiz..." -> "Ezbere Yaşayanlar"
                    const shortTitle = cleanName.split(' ').slice(0, 3).join(' ');
                    console.log("Searching Cover -> Title:", shortTitle, "Author:", cleanAuth);

                    let foundCover = await findCoverImage(shortTitle, cleanAuth);

                    // 2. Yazar eşleşmedi mi? Sadece başlık ara (OpenLibrary bu konuda iyidir)
                    if (!foundCover) {
                        const veryShortTitle = cleanName.split(' ').slice(0, 2).join(' '); // "Var Mısın"
                        console.log("Fallback Search -> Title Only:", veryShortTitle);
                        foundCover = await findCoverImage(veryShortTitle, undefined);
                    }

                    if (foundCover) {
                        finalCover = foundCover;
                        // Google Placeholder Filtresi (Basit Kontrol)
                        // Eğer URL içinde "books.google.com" varsa ve "zoom=0" yoksa, belki kalitesizdir ama şimdilik kabul edelim.
                        // Kullanıcıya "Image Not Available" çıkmaması için Google API tarafında zoom=0 zorladık zaten.
                    }
                } catch (e) {
                    console.error("Auto cover fetch failed", e);
                }
            }

            // Temizlenmiş ve Ayrıştırılmış Verilerle Kaydet
            // Title temizlerken çok agresif olmayalım, orijinali kalsın ama gereksizleri atalım.
            const displayTitle = smartClean(finalTitle);

            const newBook: Book = {
                id,
                user_id: user?.id || 'anon',
                title: displayTitle,
                author: smartClean(finalAuthor),
                file_url: null as any,
                cover_url: finalCover || randomCover,
                progress: { percentage: 0, page: 1 },
                last_read: new Date().toISOString(),
                mode_pref: 'single',
                format,
                created_at: new Date().toISOString(),
                ...metadata
            };

            await saveFile(id, file);
            newBook.file_url = `local://${id}`;

            const books = await MockAPI.books.list();
            books.push(newBook);
            localStorage.setItem('mock_books', JSON.stringify(books));

            return { data: newBook, error: null };
        },

        updateProgress: async (bookId: string, progress: any) => {
            const books = await MockAPI.books.list();
            const idx = books.findIndex(b => b.id === bookId);
            if (idx !== -1) {
                books[idx].progress = progress;
                books[idx].last_read = new Date().toISOString();
                localStorage.setItem('mock_books', JSON.stringify(books));
            }
        }
    }
};

export const getBooks = () => MockAPI.books.list();
export const deleteBook = (id: string) => MockAPI.books.delete(id);
export const updateProgress = (bookId: string, progress: any) => MockAPI.books.updateProgress(bookId, progress);
export const getBook = async (id: string): Promise<Book | null> => {
    const books = await getBooks();
    const book = books.find(b => b.id === id);
    if (!book) return null;

    if (!book.format) {
        const isPdf = book.file_url.toLowerCase().endsWith('.pdf') ||
            book.title.toLowerCase().endsWith('.pdf');
        book.format = isPdf ? 'pdf' : 'epub';
    }

    if (book.file_url.startsWith('local://')) {
        const blob = await getFile(book.id);
        if (blob) {
            book.file_url = URL.createObjectURL(blob);
        }
    }
    return book;
};
