
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
    isFavorite?: boolean;
    tags?: string[];
    collectionId?: string;
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

function parseFileName(name: string) {
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
            if (parts[0].split(' ').length <= 4 && !parts[0].toLowerCase().includes('library')) {
                return { author: parts[0], title: parts[1] };
            }
            return { title: parts[0], author: parts[1] };
        }
    }

    return { title: clean, author: 'Bilinmiyor' };
};

// --- LOCAL EXTRACTOR ---
const extractCoverLocally = async (file: File): Promise<string | undefined> => {
    try {
        if (file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
            console.log("EPUB Local Extraction attempting...");
            const ePub = (await import('epubjs')).default;
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = async (e) => {
                    try {
                        const book = ePub(e.target?.result as ArrayBuffer);
                        const coverUrl = await book.coverUrl();
                        if (coverUrl) {
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
            try {
                const pdfjsLib = await import('pdfjs-dist');
                // MATCH VERSION EXACTLY by using CDN for the worker temporarily 
                // This bypasses the local version mismatch (v5.4.530 vs v5.4.296)
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                const arrayBuffer = await file.arrayBuffer();
                const loadingOptions: any = {
                    data: new Uint8Array(arrayBuffer),
                    standardFontDataUrl: `${window.location.origin}/standard_fonts/`,
                    cMapUrl: `${window.location.origin}/cmaps/`,
                    cMapPacked: true,
                    wasmUrl: `${window.location.origin}/wasm/`,
                    imageResourcesPath: `${window.location.origin}/image_decoders/`,
                };
                const loadingTask = pdfjsLib.getDocument(loadingOptions);
                const pdf = await loadingTask.promise;

                let bestDataUrl = undefined;
                let highestScore = -1;

                // Scan first 5 pages to find the actual high-quality color cover
                const pagesToScan = Math.min(pdf.numPages, 5);

                for (let i = 1; i <= pagesToScan; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d', { willReadFrequently: true });
                    if (!context) continue;

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport, canvas }).promise;

                    // Simple visual scoring based on color variation and density
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    let colorScore = 0;
                    let nonWhitePixels = 0;

                    // Sample pixels (every 10th for performance)
                    for (let p = 0; p < imageData.length; p += 40) {
                        const r = imageData[p];
                        const g = imageData[p + 1];
                        const b = imageData[p + 2];

                        // Check if not white/grey (background)
                        if (r < 245 || g < 245 || b < 245) {
                            nonWhitePixels++;
                            // Check for color variation (R-G-B difference)
                            const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
                            if (diff > 20) colorScore += 2; // Real color
                            else colorScore += 1; // Grey/Black text
                        }
                    }

                    const fillRatio = nonWhitePixels / (imageData.length / 4);
                    // Penalize extremely white or extremely dark/empty pages
                    const pageScore = colorScore * fillRatio;

                    if (fillRatio < 0.05) { // Very empty page
                        console.log(`Page ${i} is too empty, ignoring.`);
                        continue;
                    }

                    console.log(`PDF Page ${i} Visual Score:`, pageScore);

                    // High threshold to distinguish real covers from interior pages
                    if (pageScore > highestScore) {
                        highestScore = pageScore;
                        bestDataUrl = canvas.toDataURL('image/jpeg', 0.85); // Slightly higher quality
                    }
                }

                if (highestScore > 8) {
                    console.log("PDF Smart Cover Found with Score:", highestScore);
                    return bestDataUrl;
                }
            } catch (err: any) {
                console.error("PDF extraction failed", err);
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
        changePassword: async (oldPass: string, newPass: string) => {
            await new Promise(r => setTimeout(r, 800));
            // Simulate success
            return { error: null };
        }
    },

    books: {
        list: async (): Promise<Book[]> => {
            const stored = localStorage.getItem('mock_books');
            return stored ? JSON.parse(stored) : [];
        },

        delete: async (bookId: string) => {
            await deleteFile(bookId);
            const books = await MockAPI.books.list();
            const newBooks = books.filter(b => b.id !== bookId);
            localStorage.setItem('mock_books', JSON.stringify(newBooks));
        },

        upload: async (file: File, metadata: Partial<Book>) => {
            const id = crypto.randomUUID();
            const user = MockAPI.auth.getUser();
            const format = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'epub';

            // Metadata refinement
            let finalTitle = metadata.title || file.name;
            let finalAuthor = metadata.author || 'Bilinmiyor';

            const badAuthors = ['LIBRARY', 'UNKNOWN', 'ADMIN', 'BILINMIYOR', 'ANONIM', ''];
            if (badAuthors.some(bad => finalAuthor.toUpperCase().includes(bad))) {
                const parsed = parseFileName(file.name);
                if (parsed) {
                    finalTitle = parsed.title;
                    finalAuthor = parsed.author;
                }
            }

            const displayTitle = smartClean(finalTitle);

            // PARALLEL METADATA & COVER STRATEGY
            let finalCover = metadata.cover_url;

            const [_, metadataResult] = await Promise.all([
                saveFile(id, file),
                (async () => {
                    if (finalCover) return { cover: finalCover };

                    // 1. TRY REMOTE SEARCH FIRST (Using CLEAN metadata)
                    try {
                        const remoteCover = await findCoverImage(finalTitle, finalAuthor);
                        if (remoteCover && !remoteCover.includes('unsplash')) {
                            console.log("Remote color cover found for clean title!");
                            return { cover: remoteCover };
                        }
                    } catch (e) { console.error("Remote search failed early", e); }

                    // 2. TRY LOCAL EXTRACTION AS FALLBACK
                    const localCover = await extractCoverLocally(file);
                    if (localCover) {
                        console.log("Local cover found!");
                        return { cover: localCover };
                    }

                    // 3. FINAL REMOTE FALLBACK (Placeholder)
                    const lastResort = await findCoverImage(finalTitle, finalAuthor);
                    return { cover: lastResort };
                })()
            ]);

            finalCover = metadataResult.cover;

            // FALLBACK DEFAULT IMAGE (High Quality Book Placeholder)
            if (!finalCover) {
                finalCover = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";
            }

            const newBook: Book = {
                id,
                user_id: user?.id || 'anon',
                title: displayTitle,
                author: smartClean(finalAuthor),
                file_url: `local://${id}`,
                cover_url: finalCover,
                progress: { percentage: 0, page: 1 },
                last_read: new Date().toISOString(),
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
