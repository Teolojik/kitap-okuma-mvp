
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

const parseFileName = (fileName: string) => {
    const parts = fileName.replace(/\.(pdf|epub|mobi)$/i, '').split(/\s*-\s*/);

    if (parts.length >= 2) {
        const p1 = smartClean(parts[0]);
        const p2 = smartClean(parts[1]);
        if (p1.split(' ').length <= 3 && !p1.toUpperCase().includes('LIBRARY')) {
            return { author: p1, title: p2 };
        }
    }
    return null;
};

// --- LOCAL EXTRACTOR ---
const extractCoverLocally = async (file: File): Promise<string | undefined> => {
    try {
        if (file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
            console.log("EPUB Local Extraction attempting...");
            // Dynamic import to avoid SSR issues if any
            const ePub = (await import('epubjs')).default;
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = async (e) => {
                    try {
                        const book = ePub(e.target?.result as ArrayBuffer);
                        const coverUrl = await book.coverUrl();
                        if (coverUrl) {
                            console.log("EPUB Local Cover Found:", coverUrl);
                            // Convert blob URL to base64 if needed, or just return blob url (epubjs returns blob url)
                            // Note: Blob URL might be revoked if not handled carefully, but for now it might work.
                            // Better: fetch the blob and convert to base64
                            const res = await fetch(coverUrl);
                            const blob = await res.blob();
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        } else {
                            resolve(undefined);
                        }
                    } catch (err) {
                        console.error("EPUB extract error", err);
                        resolve(undefined);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        }
        else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            console.log("PDF Local Extraction attempting (First Page)...");
            // PDF extraction is complex due to worker setup. Skipping complex setup to avoid breaking build.
            // Using a simple placeholder logic for now or rely on API.
            // If user really wants it, we need pdfjs configured.
            // For now, let's log.
            console.log("PDF extraction requires heavy workers, skipping for safety in this context.");
        }
    } catch (e) {
        console.error("Local extraction failed", e);
    }
    return undefined;
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

            // Metadata refinement
            let finalTitle = metadata.title || file.name;
            let finalAuthor = metadata.author || 'Bilinmiyor';

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

            // AUTO COVER STRATEGY
            let finalCover = metadata.cover_url;

            if (!finalCover) {
                // 1. Try Remote Search (Google -> OpenLibrary)
                try {
                    const cleanName = smartClean(finalTitle);
                    const cleanAuth = smartClean(finalAuthor);

                    // Truncate title for better search results
                    const shortTitle = cleanName.split(' ').slice(0, 3).join(' ');

                    finalCover = await findCoverImage(shortTitle, cleanAuth);

                    if (!finalCover) {
                        console.log("Remote search failed. Trying fallback (shorter title)...");
                        const veryShortTitle = cleanName.split(' ').slice(0, 2).join(' ');
                        finalCover = await findCoverImage(veryShortTitle, undefined);
                    }
                } catch (e) {
                    console.error("Remote cover fetch failed", e);
                }

                // 2. Try Local Extraction if Remote Failed
                if (!finalCover) {
                    console.log("Remote failed completely. Trying local extraction...");
                    const localCover = await extractCoverLocally(file);
                    if (localCover) {
                        finalCover = localCover;
                        console.log("Using Local Cover");
                    }
                }
            }

            // FALLBACK DEFAULT IMAGE (Unsplash) - If everything fails
            if (!finalCover) {
                console.log("All strategies failed. Using Unsplash fallback.");
                finalCover = "https://images.unsplash.com/photo-1544947950-fa07a98d4679?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
            }

            const displayTitle = smartClean(finalTitle);

            const newBook: Book = {
                id,
                user_id: user?.id || 'anon',
                title: displayTitle,
                author: smartClean(finalAuthor),
                file_url: null as any,
                cover_url: finalCover,
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
