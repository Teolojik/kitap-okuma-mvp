
import { findCoverImage } from './discovery-service';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils'; // Helper'ları kullan

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

// Simple IndexedDB wrapper for large files (books)
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

// Akıllı Temizleme Fonksiyonu
const smartClean = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\.(pdf|epub|mobi)$/i, '') // Uzantıları kaldır
        .replace(/[_\-]/g, ' ') // Alt çizgi ve tireleri boşluk yap
        .replace(/\s+/g, ' ') // Çift boşlukları temizle
        .trim();
};

// Mock API Class
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
            await new Promise(r => setTimeout(r, 800)); // Network delay
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

            // Placeholder
            const gradients = [
                'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop',
                'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=600&fit=crop',
                'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400&h=600&fit=crop'
            ];
            const randomCover = gradients[Math.floor(Math.random() * gradients.length)];

            // OTO-KAPAK STRATEJİSİ
            let finalCover = metadata.cover_url;
            if (!finalCover) {
                try {
                    // Strateji 1: Temiz Dosya İsmi + Yazar
                    const cleanName = smartClean(metadata.title || file.name);
                    const cleanAuth = smartClean(metadata.author || '');

                    let searchTerm = `${cleanName} ${cleanAuth}`.trim();
                    console.log("Cover Search 1:", searchTerm);

                    let foundCover = await findCoverImage(searchTerm);

                    // Strateji 2: Eğer bulunamazsa, sadece kitap adını (daha kısa) ara
                    if (!foundCover) {
                        // Parantez içindekileri sil (örn: "Dune (2020 Edition)" -> "Dune")
                        const simplerName = cleanName.replace(/\(.*?\)/g, '').trim();
                        console.log("Cover Search 2 (Fallback):", simplerName);
                        if (simplerName !== cleanName && simplerName.length > 3) {
                            foundCover = await findCoverImage(simplerName);
                        }
                    }

                    if (foundCover) {
                        finalCover = foundCover;
                        console.log("Cover Found:", finalCover);
                    }
                } catch (e) {
                    console.error("Auto cover fetch failed", e);
                }
            }

            const newBook: Book = {
                id,
                user_id: user?.id || 'anon',
                title: smartClean(metadata.title || file.name), // İsmi de temiz kaydet
                author: smartClean(metadata.author || 'Bilinmiyor'),
                file_url: null as any, // IDB'de saklanacak
                cover_url: finalCover || randomCover,
                progress: { percentage: 0, page: 1 },
                last_read: new Date().toISOString(),
                mode_pref: 'single',
                format,
                created_at: new Date().toISOString(),
                ...metadata
            };

            // IDB'ye kaydet (LocalURI oluşturmadan önce)
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
