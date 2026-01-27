import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Book, Collection, MockAPI, smartClean, parseFileName, extractCoverLocally, extractMetadataLocally } from '@/lib/mock-api';
import { findCoverImage } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { translations } from '@/lib/translations';

interface AuthState {
    user: any | null;
    loading: boolean;
    signIn: (email?: string, password?: string) => Promise<{ error?: any }>;
    signUp: (email: string, password: string, name: string) => Promise<{ error?: any }>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
    updateProfile: (updates: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    checkSession: async () => {
        set({ loading: true });
        const { data: { session } } = await supabase.auth.getSession();
        set({ user: session?.user ?? null, loading: false });

        supabase.auth.onAuthStateChange((_event, session) => {
            set({ user: session?.user ?? null });
            // Sync books when auth state changes
            useBookStore.getState().fetchBooks();
        });
    },
    signIn: async (email, password) => {
        set({ loading: true });
        if (!email || !password) {
            // Demo/Mock login (Sadece test için, gerçekte Supabase her zaman email/pass ister)
            // Eğer email/pass girilmediyse hata dönebiliriz ya da anonim giriş yaptırabiliriz.
            return { error: { message: "Lütfen email ve şifre girin." } };
        }
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        set({ user: data.user, loading: false });
        return { error };
    },
    signUp: async (email, password, name) => {
        set({ loading: true });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });
        set({ user: data.user, loading: false });
        return { error };
    },
    signOut: async () => {
        await supabase.auth.signOut();

        // Clear user-specific local data to prevent data leakage between accounts
        localStorage.removeItem('mock_books');
        localStorage.removeItem('epigraph_collections');
        localStorage.removeItem('reader_settings');

        // Clear IndexedDB (book files and drawings)
        try {
            const dbRequest = indexedDB.open('EpigrafDB', 2);
            dbRequest.onsuccess = () => {
                const db = dbRequest.result;
                if (db.objectStoreNames.contains('books_files')) {
                    const tx = db.transaction('books_files', 'readwrite');
                    tx.objectStore('books_files').clear();
                }
                if (db.objectStoreNames.contains('drawings')) {
                    const tx = db.transaction('drawings', 'readwrite');
                    tx.objectStore('drawings').clear();
                }
                db.close();
            };
        } catch (e) {
            console.error('Failed to clear IndexedDB:', e);
        }

        set({ user: null });
    },
    updateProfile: async (updates: any) => {
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });
        if (data?.user) {
            set({ user: data.user });
        }
    }
}));

interface ReaderState {
    settings: {
        fontSize: number;
        fontFamily: string;
        theme: 'light' | 'dark' | 'sepia';
        readingMode: 'single' | 'double-animated' | 'double-static' | 'split';
        lineHeight: number;
        letterSpacing: number;
        margin: number;
        ttsSpeed: number;
        ttsVoice: string;
        ttsPitch: number;
        language: 'tr' | 'en';
        paddingTop: number;
        paddingBottom: number;
    };
    setSettings: (settings: Partial<ReaderState['settings']>) => void;
    secondaryBookId: string | null;
    setSecondaryBookId: (id: string | null) => void;

    bookmarks: Record<string, Array<{ id: string; location: string; note?: string; createdAt: string }>>;
    addBookmark: (bookId: string, location: string, note?: string) => void;
    removeBookmark: (bookId: string, bookmarkId: string) => void;

    annotations: Record<string, Array<{
        id: string;
        cfiRange: string;
        text: string;
        color: string;
        note?: string;
        createdAt: string;
        type: 'highlight' | 'note';
    }>>;
    addAnnotation: (bookId: string, annotation: any) => void;
    removeAnnotation: (bookId: string, id: string) => void;

    stats: {
        totalPagesRead: number;
        totalReadingTime: number;
        currentStreak: number;
        lastReadDate: string | null;
        dailyPages: Record<string, number>;
        achievements: Array<{ id: string; unlockedAt: string }>;
        bookTime: Record<string, number>; // bookId -> seconds
    };
    updateStats: (pagesRead: number, bookId?: string, timeSpent?: number) => void;
    drawings: Record<string, string>; // pageKey -> dataURL
    saveDrawing: (pageKey: string, data: string) => void;
    fetchDrawingsForBook: (bookId: string) => Promise<void>;
}

interface BookState {
    books: Book[];
    loading: boolean;
    fetchBooks: () => Promise<void>;
    uploadBook: (file: File, meta: any) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    updateProgress: (id: string, progress: any) => Promise<void>;
    touchLastRead: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    updateBookTags: (id: string, tags: string[]) => Promise<void>;
    assignToCollection: (bookId: string, collectionId: string | null) => Promise<void>;
    collections: Collection[];
    addCollection: (collection: Collection) => Promise<void>;
    removeCollection: (id: string) => Promise<void>;
    updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
    guestLimitTrigger: number;
    triggerGuestLimit: () => void;
}

export const useBookStore = create<BookState & ReaderState>((set, get) => ({
    books: [],
    collections: [],
    loading: false,
    guestLimitTrigger: 0,
    triggerGuestLimit: () => set(state => ({ guestLimitTrigger: state.guestLimitTrigger + 1 })),
    fetchBooks: async () => {
        set({ loading: true });
        try {
            const user = useAuthStore.getState().user;
            if (user) {
                const { data, error } = await supabase
                    .from('books')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    set({ books: data as Book[] });
                }
            } else {
                const books = await MockAPI.books.list();
                set({ books });
            }

            // Ensure System Collections are always present
            const systemCollections: Collection[] = [
                { id: 'all', name: 'All Books', icon: 'Library', color: 'bg-blue-500' },
                { id: 'favorites', name: 'Favorites', icon: 'Heart', color: 'bg-red-500' },
                { id: 'reading', name: 'Currently Reading', icon: 'BookOpen', color: 'bg-orange-500' },
                { id: 'finished', name: 'Finished', icon: 'CheckCircle', color: 'bg-green-500' }
            ];

            let userCollections: Collection[] = [];
            if (user) {
                const { data: collData } = await supabase
                    .from('collections')
                    .select('*')
                    .order('name');
                if (collData) {
                    // Filter out system collections from database (in case they were accidentally saved)
                    userCollections = (collData as Collection[]).filter(c =>
                        !['all', 'favorites', 'reading', 'finished'].includes(c.id)
                    );
                }
            } else {
                // Load from localStorage for guest users
                const storedCollections = localStorage.getItem('mock_collections');
                if (storedCollections) {
                    try {
                        const parsed = JSON.parse(storedCollections);
                        // Filter out system collections, keep only user-created ones
                        userCollections = parsed.filter((c: Collection) =>
                            !['all', 'favorites', 'reading', 'finished'].includes(c.id)
                        );
                    } catch (e) {
                        console.error('Failed to parse collections from localStorage', e);
                    }
                }
            }

            // Combine system + user collections
            set({ collections: [...systemCollections, ...userCollections] });

            if (user) {
                // Fetch Annotations...
                const { data: annData } = await supabase.from('annotations').select('*');
                if (annData) {
                    const annMap: any = {};
                    annData.forEach((ann: any) => {
                        if (!annMap[ann.book_id]) annMap[ann.book_id] = [];
                        annMap[ann.book_id].push({
                            id: ann.id,
                            cfiRange: ann.cfi_range,
                            text: ann.text,
                            note: ann.note,
                            color: ann.color,
                            type: ann.type,
                            createdAt: ann.created_at
                        });
                    });
                    set({ annotations: annMap });
                }

                // Fetch Bookmarks...
                const { data: bookmarkData } = await supabase.from('bookmarks').select('*');
                if (bookmarkData) {
                    const bookmarkMap: any = {};
                    bookmarkData.forEach((b: any) => {
                        if (!bookmarkMap[b.book_id]) bookmarkMap[b.book_id] = [];
                        bookmarkMap[b.book_id].push({
                            id: b.id,
                            location: b.location,
                            note: b.note,
                            createdAt: b.created_at
                        });
                    });
                    set({ bookmarks: bookmarkMap });
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('settings, stats')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    if (profileData.settings) set(state => ({ settings: { ...state.settings, ...profileData.settings } }));
                    if (profileData.stats) set(state => ({ stats: { ...state.stats, ...profileData.stats } }));
                }
            }
        } finally {
            set({ loading: false });
        }
    },
    uploadBook: async (file, meta) => {
        const user = useAuthStore.getState().user;
        const currentBooks = get().books;
        const currentLang = get().settings.language || 'tr';
        const t = (key: keyof typeof translations['tr']) => translations[currentLang][key] || key;

        // Guest limit check (only 1 book allowed locally/guest)
        if (!user && currentBooks.length >= 1) {
            get().triggerGuestLimit();
            toast.error(t('guestLimitReached'), {
                description: t('guestLimitDescription'),
                duration: 10000,
            });
            return;
        }

        set({ loading: true });
        try {
            // Determine paths and metadata
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const userIdPath = user ? user.id : 'guest';
            const filePath = `${userIdPath}/${fileName}`;

            // Metadata refinement
            let finalTitle = meta.title || file.name;
            let finalAuthor = meta.author || '';

            // 1. Try local extraction first to improve discovery
            if (!finalAuthor || finalAuthor === '' || finalTitle === file.name) {
                const localMeta = await extractMetadataLocally(file);
                if (localMeta) {
                    if (!finalAuthor && localMeta.author) finalAuthor = localMeta.author;
                    if (finalTitle === file.name && localMeta.title) finalTitle = localMeta.title;
                    console.log("Local metadata applied for discovery:", { finalTitle, finalAuthor });
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

            // COVER EXTRACTION STRATEGY
            let finalCover = meta.cover_url;

            // Try local cover extraction
            if (!finalCover) {
                console.log('Cover Search: Starting local extraction first...');
                const localCover = await extractCoverLocally(file).catch(err => {
                    console.error('Local cover extraction failed:', err);
                    return null;
                });

                if (localCover) {
                    finalCover = localCover;
                } else {
                    // Remote discovery
                    const discovery = await findCoverImage(displayTitle, finalAuthor).catch(() => null);
                    if (discovery && discovery.url && !discovery.url.includes('unsplash')) {
                        finalCover = discovery.url;
                        if (!finalAuthor || finalAuthor === '') {
                            finalAuthor = discovery.author || '';
                        }
                    }
                }
            }

            if (!finalCover) {
                finalCover = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";
            }

            // ATTEMPT SUPABASE UPLOAD (Guest or User)
            try {
                // Step 1: Upload file to storage
                const { error: uploadError } = await supabase.storage
                    .from('books')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('books')
                    .getPublicUrl(filePath);

                // Step 2: Insert into DB
                const { error: dbError } = await supabase
                    .from('books')
                    .insert({
                        user_id: user ? user.id : null, // Send null for guest if allowed
                        title: displayTitle,
                        author: smartClean(finalAuthor),
                        cover_url: finalCover,
                        file_url: publicUrl,
                        file_type: file.name.split('.').pop() === 'pdf' ? 'pdf' : 'epub',
                        file_size: file.size,
                    });

                if (dbError) throw dbError;

            } catch (supabaseError) {
                console.warn("Supabase upload failed (likely guest permissions), falling back to Local MockAPI:", supabaseError);

                // If Supabase fails (e.g. RLS blocks guest insert), fallback to MockAPI
                if (!user) {
                    await MockAPI.books.upload(file, {
                        ...meta,
                        title: displayTitle,
                        author: finalAuthor,
                        cover_url: finalCover
                    });

                    // Show specific error TOAST to let user/admin know why it's invisible remotely
                    // toast.warning("Kitap sadece cihazınıza kaydedildi (Cloud yükleme izni yok).");
                } else {
                    throw supabaseError; // Re-throw for logged-in users
                }
            }

            await get().fetchBooks();
        } catch (e) {
            console.error("Upload process failed:", e);
            throw e;
        } finally {
            set({ loading: false });
        }
    },
    deleteBook: async (id) => {
        set({ loading: true });
        try {
            const user = useAuthStore.getState().user;
            const book = get().books.find(b => b.id === id);

            if (user && book && book.file_url) {
                // Determine the storage path from public link
                // URL example: .../storage/v1/object/public/books/USER_ID/FILENAME
                const parts = book.file_url.split('/storage/v1/object/public/books/');
                if (parts.length > 1) {
                    const storagePath = parts[1];
                    console.log("Cleaning up storage file:", storagePath);
                    await supabase.storage.from('books').remove([storagePath]);
                }

                // Delete the record from DB
                const { error } = await supabase
                    .from('books')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                await MockAPI.books.delete(id);
            }
            await get().fetchBooks();
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            set({ loading: false });
        }
    },
    updateProgress: async (id, progress) => {
        const user = useAuthStore.getState().user;
        const now = new Date().toISOString();
        const updatedProgress = { ...progress, lastActive: now };

        // Track stats locally first
        const oldBook = get().books.find(b => b.id === id);
        if (oldBook && oldBook.progress && progress.page > (oldBook.progress.page || 0)) {
            const diff = progress.page - (oldBook.progress.page || 0);
            get().updateStats(diff, id, 0);
        }

        // Update local state immediately for UI responsiveness
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, progress: updatedProgress } : b)
        }));

        if (user) {
            try {
                // The most reliable way: only update the progress JSON field
                await supabase
                    .from('books')
                    .update({ progress: updatedProgress })
                    .eq('id', id);
            } catch (e) {
                console.error("Critical progress sync error:", e);
            }
        } else {
            await MockAPI.books.updateProgress(id, updatedProgress);
        }
    },

    touchLastRead: async (id) => {
        const user = useAuthStore.getState().user;
        const now = new Date().toISOString();

        const book = get().books.find(b => b.id === id);
        if (!book) return;

        const updatedProgress = { ...book.progress, lastActive: now };

        // Update local state
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, progress: updatedProgress } : b)
        }));

        if (user) {
            try {
                // Push the updated progress (with new lastActive) to Supabase
                await supabase
                    .from('books')
                    .update({ progress: updatedProgress })
                    .eq('id', id);
            } catch (e) { }
        } else {
            await MockAPI.books.updateProgress(id, updatedProgress);
        }
    },

    toggleFavorite: async (id) => {
        const user = useAuthStore.getState().user;
        const book = get().books.find(b => b.id === id);
        if (!book) return;

        const nextFav = !book.is_favorite;

        if (user) {
            await supabase
                .from('books')
                .update({ is_favorite: nextFav })
                .eq('id', id);
        }

        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, is_favorite: nextFav } : b)
        }));

        // Mock store update for guest or fallback
        if (!user) {
            const books = get().books.map(b => b.id === id ? { ...b, is_favorite: nextFav } : b);
            localStorage.setItem('mock_books', JSON.stringify(books));
        }
    },

    updateBookTags: async (id, tags) => {
        const books = get().books.map(b => b.id === id ? { ...b, tags } : b);
        localStorage.setItem('mock_books', JSON.stringify(books));
        set({ books });
    },

    assignToCollection: async (bookId, collectionId) => {
        const books = get().books.map(b => b.id === bookId ? { ...b, collection_id: collectionId || undefined } : b);
        localStorage.setItem('mock_books', JSON.stringify(books));
        set({ books });
    },

    addCollection: async (collection) => {
        const user = useAuthStore.getState().user;
        if (user) {
            await supabase.from('collections').insert({
                ...collection,
                user_id: user.id
            });
        }
        const collections = [...get().collections, collection];
        localStorage.setItem('mock_collections', JSON.stringify(collections));
        set({ collections });
    },

    removeCollection: async (id) => {
        const collections = get().collections.filter(c => c.id !== id);
        const books = get().books.map(b => b.collection_id === id ? { ...b, collection_id: undefined } : b);
        localStorage.setItem('mock_collections', JSON.stringify(collections));
        localStorage.setItem('mock_books', JSON.stringify(books));
        set({ collections, books });
    },

    updateCollection: async (id, updates) => {
        const collections = get().collections.map(c => c.id === id ? { ...c, ...updates } : c);
        localStorage.setItem('mock_collections', JSON.stringify(collections));
        set({ collections });
    },

    // Reader State
    settings: {
        fontSize: 100,
        fontFamily: 'Inter',
        theme: 'sepia',
        readingMode: 'single',
        lineHeight: 1.5,
        letterSpacing: 0,
        margin: 20,
        ttsSpeed: 1,
        ttsVoice: '',
        ttsPitch: 1,
        language: 'tr',
        paddingTop: 20,
        paddingBottom: 20,
    },
    setSettings: (newSettings) => {
        set(state => {
            const settings = { ...state.settings, ...newSettings };
            localStorage.setItem('reader_settings', JSON.stringify(settings));

            // Sync settings to Supabase Profile
            const user = useAuthStore.getState().user;
            if (user) {
                supabase.from('profiles').update({ settings }).eq('id', user.id).then();
            }

            return { settings };
        });
    },
    secondaryBookId: null,
    setSecondaryBookId: (id) => set({ secondaryBookId: id }),

    bookmarks: {},
    addBookmark: async (bookId, location, note) => {
        const user = useAuthStore.getState().user;
        const newBookmark = { id: crypto.randomUUID(), location, note, createdAt: new Date().toISOString() };

        if (user) {
            await supabase.from('bookmarks').insert({
                ...newBookmark,
                book_id: bookId,
                user_id: user.id
            });
        }

        set(state => {
            const bookBookmarks = state.bookmarks[bookId] || [];
            return {
                bookmarks: {
                    ...state.bookmarks,
                    [bookId]: [...bookBookmarks, newBookmark]
                }
            };
        });
    },
    removeBookmark: async (bookId, bookmarkId) => {
        const user = useAuthStore.getState().user;
        if (user) {
            await supabase.from('bookmarks').delete().eq('id', bookmarkId);
        }

        set(state => {
            const bookBookmarks = state.bookmarks[bookId] || [];
            return {
                bookmarks: {
                    ...state.bookmarks,
                    [bookId]: bookBookmarks.filter(b => b.id !== bookmarkId)
                }
            };
        });
    },

    annotations: {},
    addAnnotation: async (bookId, annotation) => {
        const user = useAuthStore.getState().user;
        const newAnnotation = { ...annotation, id: annotation.id || crypto.randomUUID(), createdAt: new Date().toISOString() };

        if (user) {
            // Mapping from frontend interface to snake_case DB schema
            await supabase.from('annotations').insert({
                id: newAnnotation.id,
                book_id: bookId,
                user_id: user.id,
                cfi_range: newAnnotation.cfiRange,
                text: newAnnotation.text,
                color: newAnnotation.color,
                note: newAnnotation.note,
                type: newAnnotation.type
            });
        }

        set(state => {
            const bookAnnotations = state.annotations[bookId] || [];
            return {
                annotations: {
                    ...state.annotations,
                    [bookId]: [...bookAnnotations, newAnnotation]
                }
            };
        });
    },
    removeAnnotation: async (bookId, id) => {
        const user = useAuthStore.getState().user;
        if (user) {
            await supabase.from('annotations').delete().eq('id', id);
        }

        set(state => {
            const bookAnnotations = state.annotations[bookId] || [];
            return {
                annotations: {
                    ...state.annotations,
                    [bookId]: bookAnnotations.filter(a => a.id !== id)
                }
            };
        });
    },

    // Stats
    stats: {
        totalPagesRead: 0,
        totalReadingTime: 0,
        currentStreak: 0,
        lastReadDate: null,
        dailyPages: {},
        achievements: [],
        bookTime: {},
    },
    updateStats: (pagesRead, bookId, timeSpent = 0) => {
        set(state => {
            const today = new Date().toISOString().split('T')[0];
            const newDailyPages = { ...state.stats.dailyPages };
            newDailyPages[today] = (newDailyPages[today] || 0) + pagesRead;

            const newBookTime = { ...state.stats.bookTime };
            if (bookId) {
                newBookTime[bookId] = (newBookTime[bookId] || 0) + timeSpent;
            }

            const newTotalPages = state.stats.totalPagesRead + pagesRead;
            const newAchievements = [...state.stats.achievements];

            const currentLang = state.settings.language || 'tr';
            const t = (key: keyof typeof translations['tr'], params?: any) => {
                let text = translations[currentLang][key] || key;
                if (params) {
                    Object.entries(params).forEach(([k, v]) => {
                        text = text.replace(`{${k}}`, String(v));
                    });
                }
                return text;
            };

            // Logic for unlocking achievements
            if (newTotalPages >= 10 && !newAchievements.find(a => a.id === 'kitap-kurdu')) {
                newAchievements.push({ id: 'kitap-kurdu', unlockedAt: new Date().toISOString() });
                toast.success(t('achievementUnlocked', { title: t('achievementKitapKurduTitle') }), {
                    description: t('achievementKitapKurduDesc'),
                    icon: '📚'
                });
            }

            if (newTotalPages >= 100 && !newAchievements.find(a => a.id === 'usta-okur')) {
                newAchievements.push({ id: 'usta-okur', unlockedAt: new Date().toISOString() });
                toast.success(t('achievementUnlocked', { title: t('achievementUstaOkurTitle') }), {
                    description: t('achievementUstaOkurDesc'),
                    icon: '🏆'
                });
            }

            const newStats = {
                ...state.stats,
                totalPagesRead: newTotalPages,
                totalReadingTime: state.stats.totalReadingTime + timeSpent,
                dailyPages: newDailyPages,
                bookTime: newBookTime,
                achievements: newAchievements,
                lastReadDate: today
            };

            localStorage.setItem('reader_stats', JSON.stringify(newStats));

            // Sync to Supabase
            const user = useAuthStore.getState().user;
            if (user) {
                supabase.from('profiles').update({ stats: newStats }).eq('id', user.id).then();
            }

            return { stats: newStats };
        });
    },
    drawings: {},
    saveDrawing: async (pageKey, data) => {
        const user = useAuthStore.getState().user;

        // 1. Update local UI state
        set(state => ({
            drawings: { ...state.drawings, [pageKey]: data }
        }));

        // 2. Persist to Local DB (IndexedDB via MockAPI) - Always do this
        try {
            await MockAPI.drawings.save(pageKey, data);
        } catch (dbErr) {
            console.warn("Local DB drawing save failed, falling back to localStorage:", dbErr);
            localStorage.setItem(`drawing_${pageKey}`, data);
        }

        // 3. Sync to Cloud if user is logged in
        if (user) {
            try {
                const lastHyphenIndex = pageKey.lastIndexOf('-');
                const bookId = pageKey.substring(0, lastHyphenIndex);

                const { error } = await supabase.from('drawings').upsert({
                    user_id: user.id,
                    book_id: bookId,
                    page_key: pageKey,
                    data_url: data
                }, { onConflict: 'user_id,book_id,page_key' });

                if (error) console.error("Cloud drawing sync failed:", error);
            } catch (err) {
                console.error("Critical drawing sync error:", err);
            }
        }
    },
    fetchDrawingsForBook: async (bookId) => {
        // 1. First load from Local DB (Fastest)
        try {
            const localData = await MockAPI.drawings.listForBook(bookId);
            if (Object.keys(localData).length > 0) {
                set(state => ({
                    drawings: { ...state.drawings, ...localData }
                }));
            }
        } catch (err) {
            console.error("Local drawing fetch failed:", err);
        }

        // 2. Then sync from Cloud if user is logged in
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('drawings')
                .select('page_key, data_url')
                .eq('book_id', bookId);

            if (data && !error && data.length > 0) {
                set(state => {
                    const newDrawings = { ...state.drawings };
                    data.forEach(d => {
                        newDrawings[d.page_key] = d.data_url;
                        // Also update local DB with fresh cloud data
                        MockAPI.drawings.save(d.page_key, d.data_url).catch(() => { });
                    });
                    return { drawings: newDrawings };
                });
            }
        } catch (err) {
            console.error("Cloud drawing fetch failed:", err);
        }
    },
}));

// Initialize from LocalStorage
const savedSettings = localStorage.getItem('reader_settings');
if (savedSettings) {
    const parsed = JSON.parse(savedSettings);
    useBookStore.setState((state) => ({
        settings: { ...state.settings, ...parsed }
    }));
}
const savedStats = localStorage.getItem('reader_stats');
if (savedStats) {
    const parsed = JSON.parse(savedStats);
    useBookStore.setState((state) => ({
        stats: { ...state.stats, ...parsed }
    }));
}
const savedDrawings = localStorage.getItem('reader_drawings');
if (savedDrawings) {
    useBookStore.setState({ drawings: JSON.parse(savedDrawings) });
}
