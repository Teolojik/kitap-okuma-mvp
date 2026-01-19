import { supabase } from './supabase';
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
        lastActive?: string; // Embedded timestamp to bypass schema limitations
    };
    mode_pref: 'single' | 'double' | 'split';
    format: 'epub' | 'pdf';
    is_favorite?: boolean;
    tags?: string[];
    collection_id?: string;
    created_at: string;
}

export interface Collection {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}

const DB_NAME = 'EpigrafDB';
const STORE_NAME = 'books_files';
const DRAWINGS_STORE = 'drawings';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            if (!db.objectStoreNames.contains(DRAWINGS_STORE)) {
                db.createObjectStore(DRAWINGS_STORE);
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

export const smartClean = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\.(pdf|epub|mobi)$/i, '')
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\(.*?\)/g, '')
        .replace(/\b(indir|download|full|tam|surum|baski|edition)\b/gi, '')
        .trim();
};

export function parseFileName(name: string) {
    // 1. Extreme cleaning (Subtitle, Metadata, Hex, ISBN removal)
    let clean = name.replace(/\.(epub|pdf)$/i, '')
        .split(/\s*--\s*/)[0]
        .split(' (')[0]
        .split(' [')[0]
        .split(' _ ')[0]
        .split(' : ')[0]
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*\)/g, '')
        .replace(/\d{13}/, '')
        .trim();

    // 2. Format Handling
    if (clean.includes(' - ')) {
        const parts = clean.split(' - ').map(p => p.trim());
        if (parts.length >= 2) {
            // If parts[0] is short, it's probably the author
            if (parts[0].split(' ').length <= 4 && !parts[0].toLowerCase().includes('library')) {
                return { author: cleanAuthor(parts[0]), title: cleanTitle(parts[1]) };
            }
            return { title: cleanTitle(parts[0]), author: cleanAuthor(parts[1]) };
        }
    }

    return { title: clean, author: '' };
};

// --- LOCAL METADATA EXTRACTOR ---
export const extractMetadataLocally = async (file: File): Promise<{ title?: string; author?: string } | undefined> => {
    try {
        if (file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
            const ePub = (await import('epubjs')).default;
            const book = ePub(await file.arrayBuffer());
            const metadata = await book.loaded.metadata;
            console.log("EPUB Local Metadata Found:", metadata);
            return {
                title: metadata.title,
                author: metadata.creator
            };
        }
        else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdf = await loadingTask.promise;
                const metadata = await pdf.getMetadata();

                console.log("PDF Local Metadata Found:", metadata);

                return {
                    title: (metadata.info as any)?.Title,
                    author: (metadata.info as any)?.Author
                };
            } catch (err) {
                console.error("PDF metadata extraction failed", err);
            }
        }
    } catch (e) {
        console.error("Local metadata extraction failed", e);
    }
    return undefined;
};

export const extractCoverLocally = async (file: File): Promise<string | undefined> => {
    try {
        if (file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
            console.log("EPUB Cover Extraction: Starting...");
            const ePub = (await import('epubjs')).default;
            const book = ePub(await file.arrayBuffer());

            try {
                // Wait for book to be ready
                await book.ready;

                // Strategy 1: Use epubjs built-in coverUrl (most reliable)
                const coverUrl = await book.coverUrl();

                if (coverUrl) {
                    console.log("EPUB Cover: Found via coverUrl()");
                    // Fetch and convert to base64 to avoid CORS issues
                    try {
                        const response = await fetch(coverUrl);
                        const blob = await response.blob();

                        return new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64 = reader.result as string;
                                console.log("EPUB Cover: Successfully converted to base64");
                                resolve(base64);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (fetchError) {
                        console.warn("EPUB Cover: Fetch failed, trying archive extraction", fetchError);
                    }
                }

                // Strategy 2: Direct archive extraction (bypasses CORS)
                const archive = (book as any).archive;
                if (archive) {
                    // Try to find cover in manifest
                    const manifest = (book as any).packaging?.manifest;
                    if (manifest) {
                        // Look for cover-image property
                        let coverHref = null;
                        for (const [id, item] of Object.entries(manifest)) {
                            const manifestItem = item as any;
                            if (manifestItem.properties?.includes('cover-image') ||
                                id.toLowerCase().includes('cover') ||
                                manifestItem.href?.toLowerCase().includes('cover')) {
                                coverHref = manifestItem.href;
                                break;
                            }
                        }

                        if (coverHref) {
                            console.log("EPUB Cover: Found in manifest:", coverHref);
                            const imageData = await archive.request(coverHref, 'blob');

                            return new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    console.log("EPUB Cover: Extracted from archive");
                                    resolve(reader.result as string);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(imageData);
                            });
                        }
                    }
                }

                console.log("EPUB Cover: Not found, using fallback");
            } catch (epubError) {
                console.error("EPUB Cover Extraction Error:", epubError);
            }
        }
        else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            try {
                const pdfjsLib = await import('pdfjs-dist');

                // Disable worker to avoid version mismatch issues - runs in main thread
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdf = await loadingTask.promise;

                // Simply render the first page as cover (most reliable approach)
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 }); // Good quality for cover
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (!context) {
                    console.error("PDF Cover: Could not get canvas context");
                    return undefined;
                }

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport, canvas }).promise;

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                console.log("PDF Cover: Successfully extracted first page");
                return dataUrl;
            } catch (err: any) {
                console.error("PDF cover extraction failed:", err?.message || err);
                return undefined;
            }
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
        },
        updateProfile: async (updates: any) => {
            await new Promise(r => setTimeout(r, 500));
            const u = localStorage.getItem('auth_user');
            const user = u ? JSON.parse(u) : null;
            if (user) {
                const updatedUser = { ...user, ...updates };
                localStorage.setItem('auth_user', JSON.stringify(updatedUser));
                return { data: { user: updatedUser }, error: null };
            }
            return { data: null, error: 'User not found' };
        },
        changePassword: async (_oldPass: string, newPass: string) => {
            try {
                const { error } = await supabase.auth.updateUser({
                    password: newPass
                });
                if (error) throw error;
                return { error: null };
            } catch (error: any) {
                console.error("Password change error:", error);
                return { error: error.message || 'Şifre değiştirilemedi' };
            }
        }
    },

    books: {
        list: async (): Promise<Book[]> => {
            const stored = localStorage.getItem('mock_books');
            const books: Book[] = stored ? JSON.parse(stored) : [];

            // Return processed copies for the UI, but keep raw identifiers internally
            const processed = await Promise.all(books.map(async b => {
                const book = { ...b };
                if (book.file_url?.startsWith('local://')) {
                    const blob = await getFile(book.id);
                    if (blob) book.file_url = URL.createObjectURL(blob);
                }
                if (book.cover_url?.startsWith('local://cover_')) {
                    const covId = book.cover_url.replace('local://cover_', '');
                    const blob = await getFile(covId);
                    if (blob) book.cover_url = URL.createObjectURL(blob);
                }
                return book;
            }));
            return processed;
        },

        delete: async (bookId: string) => {
            await deleteFile(bookId);
            const stored = localStorage.getItem('mock_books');
            const books: Book[] = stored ? JSON.parse(stored) : [];
            const newBooks = books.filter(b => b.id !== bookId);
            localStorage.setItem('mock_books', JSON.stringify(newBooks));
        },

        upload: async (file: File, metadata: Partial<Book>) => {
            const id = crypto.randomUUID();
            const user = MockAPI.auth.getUser();
            const format = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'epub';

            // Metadata refinement
            let finalTitle = metadata.title || file.name;
            let finalAuthor = metadata.author || '';

            // 1. Try local extraction first
            if (!finalAuthor || finalAuthor === '' || finalTitle === file.name) {
                const localMeta = await extractMetadataLocally(file).catch(() => null);
                if (localMeta) {
                    if (!finalAuthor && localMeta.author) finalAuthor = localMeta.author;
                    if (finalTitle === file.name && localMeta.title) finalTitle = localMeta.title;
                    console.log("Local metadata applied:", { finalTitle, finalAuthor });
                }
            }

            const badAuthors = ['LIBRARY', 'UNKNOWN', 'ADMIN', 'BILINMIYOR', 'ANONIM', ''];
            if (badAuthors.some(bad => finalAuthor.toUpperCase().includes(bad))) {
                const parsed = parseFileName(file.name);
                if (parsed) {
                    finalTitle = parsed.title;
                    finalAuthor = parsed.author;
                }
            }

            const displayTitle = smartClean(finalTitle);

            // PARALLEL METADATA & COVER STRATEGY - Wait for everything
            let finalCover = metadata.cover_url;

            const [_, metadataResult] = await Promise.all([
                saveFile(id, file),
                (async () => {
                    if (finalCover) return { cover: finalCover };

                    // Try local cover first (prioritized)
                    const localCover = await extractCoverLocally(file).catch(() => null);
                    if (localCover) {
                        console.log("Local cover extracted successfully");
                        return { cover: localCover };
                    }

                    // Then try remote search
                    const discovery = await findCoverImage(displayTitle, finalAuthor).catch(() => null);
                    if (discovery && discovery.url && !discovery.url.includes('unsplash')) {
                        if (!finalAuthor || finalAuthor === '') {
                            finalAuthor = discovery.author || '';
                        }
                        return { cover: discovery.url };
                    }

                    return { cover: undefined };
                })()
            ]);

            finalCover = metadataResult.cover;

            // FALLBACK DEFAULT IMAGE
            if (!finalCover) {
                finalCover = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";
            }

            const newBook: Book = {
                id,
                user_id: user?.id || 'anon',
                title: displayTitle,
                author: cleanAuthor(finalAuthor),
                file_url: `local://${id}`,
                cover_url: finalCover,
                progress: { percentage: 0, page: 1, lastActive: new Date().toISOString() },
                mode_pref: 'single',
                format,
                created_at: new Date().toISOString(),
                ...metadata
            };

            const books = await MockAPI.books.list();
            books.push(newBook);
            localStorage.setItem('mock_books', JSON.stringify(books));

            return { data: newBook, error: null };
        },


        updateProgress: async (bookId: string, progress: any) => {
            const stored = localStorage.getItem('mock_books');
            const books: Book[] = stored ? JSON.parse(stored) : [];
            const idx = books.findIndex(b => b.id === bookId);
            if (idx !== -1) {
                books[idx].progress = progress;
                localStorage.setItem('mock_books', JSON.stringify(books));
            }
        }
    },

    drawings: {
        save: async (pageKey: string, dataUrl: string) => {
            const db = await openDB();
            return new Promise<void>((resolve, reject) => {
                const tx = db.transaction(DRAWINGS_STORE, 'readwrite');
                const store = tx.objectStore(DRAWINGS_STORE);
                store.put(dataUrl, pageKey);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },
        listForBook: async (bookId: string) => {
            const db = await openDB();
            return new Promise<Record<string, string>>((resolve, reject) => {
                const tx = db.transaction(DRAWINGS_STORE, 'readonly');
                const store = tx.objectStore(DRAWINGS_STORE);
                const request = store.openCursor();
                const results: Record<string, string> = {};

                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                    if (cursor) {
                        const key = cursor.key as string;
                        if (key.startsWith(bookId)) {
                            results[key] = cursor.value;
                        }
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        }
    }
};

export const getBooks = () => MockAPI.books.list();
export const deleteBook = (id: string) => MockAPI.books.delete(id);
export const updateProgress = (bookId: string, progress: any) => MockAPI.books.updateProgress(bookId, progress);
export const getBook = async (id: string): Promise<Book | null> => {
    // 1. First check local storage
    const localBooks = await getBooks();
    const localBook = localBooks.find(b => b.id === id);
    if (localBook) {
        if (!localBook.format) {
            const isPdf = localBook.file_url.toLowerCase().endsWith('.pdf') ||
                localBook.title.toLowerCase().endsWith('.pdf');
            localBook.format = isPdf ? 'pdf' : 'epub';
        }

        if (localBook.file_url.startsWith('local://')) {
            const blob = await getFile(localBook.id);
            if (blob) {
                localBook.file_url = URL.createObjectURL(blob);
            }
        }
        return localBook;
    }

    // 2. Then check Supabase if session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', id)
            .single();

        if (data && !error) {
            const book = data as Book;
            if (!book.format) {
                const isPdf = book.file_url.toLowerCase().endsWith('.pdf') ||
                    book.title.toLowerCase().endsWith('.pdf');
                book.format = isPdf ? 'pdf' : 'epub';
            }
            return book;
        }
    }

    return null;
};
