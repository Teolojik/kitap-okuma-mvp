
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

// Akıllı Temizleme Fonksiyonu
const smartClean = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\.(pdf|epub|mobi)$/i, '')
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        // Parantez içi bilgileri (yıl, yayıncı vb) temizle
        .replace(/\(.*?\)/g, '')
        // Yaygın eklentileri temizle
        .replace(/\b(indir|download|full|tam|surum|baski|edition)\b/gi, '')
        .trim();
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

            // OTO-KAPAK STRATEJİSİ (Structured Search)
            let finalCover = metadata.cover_url;
            if (!finalCover) {
                try {
                    // Metadata'dan veya dosya adından temizleyerek al
                    const rawTitle = metadata.title || file.name;
                    const rawAuthor = metadata.author || '';

                    // İsimleri temizle
                    const cleanName = smartClean(rawTitle);
                    const cleanAuth = smartClean(rawAuthor);

                    console.log("Structured Search -> Title:", cleanName, "Author:", cleanAuth);

                    // Yeni fonksiyona ayrı ayrı gönder
                    let foundCover = await findCoverImage(cleanName, cleanAuth);

                    // Eğer bulunamazsa ve isim çok uzunsa, sadece ilk 3-4 kelimeyi al (subtitle temizliği)
                    if (!foundCover && cleanName.split(' ').length > 4) {
                        const shortName = cleanName.split(' ').slice(0, 4).join(' ');
                        console.log("Fallback Search (Short Title):", shortName);
                        foundCover = await findCoverImage(shortName, cleanAuth);
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
                title: smartClean(metadata.title || file.name),
                author: smartClean(metadata.author || 'Bilinmiyor'),
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
