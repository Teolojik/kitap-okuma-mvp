import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Book, Collection, MockAPI, smartClean, parseFileName, extractCoverLocally, extractMetadataLocally } from '@/lib/mock-api';
import { findCoverImage } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { translations } from '@/lib/translations';

// Slices
import { createAuthSlice, AuthSlice } from './slices/auth.slice';
import { createBookSlice, BookSlice } from './slices/book.slice';
import { createReaderSlice, ReaderSlice } from './slices/reader.slice';

export const useAuthStore = create<AuthSlice>()((...a) => ({
    ...createAuthSlice(...a),
}));

// Initialize Auth
useAuthStore.getState().checkSession();

export const useBookStore = create<BookSlice & ReaderSlice>()((set, get, api) => {
    // Auth Listener to re-fetch when user changes
    useAuthStore.subscribe((state, prevState) => {
        if (state.user?.id !== prevState.user?.id) {
            get().fetchBooks();
        }
    });

    return {
        ...createBookSlice(set, get, api),
        ...createReaderSlice(set, get, api),

        // Overriding complex methods that need Auth or full state access
        fetchBooks: async () => {
            set({ loading: true });
            try {
                const user = useAuthStore.getState().user;
                if (user) {
                    const { data, error } = await supabase
                        .from('books')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        set({ books: data as Book[] });
                    }
                } else {
                    const books = await MockAPI.books.list();
                    set({ books });
                }

                // Sync bookmarks and annotations for all books if logged in
                if (user) {
                    const { data: bData } = await supabase.from('bookmarks').select('*').eq('user_id', user.id);
                    if (bData) {
                        const bmMap: Record<string, any[]> = {};
                        bData.forEach(bm => {
                            if (!bmMap[bm.book_id]) bmMap[bm.book_id] = [];
                            bmMap[bm.book_id].push(bm);
                        });
                        set({ bookmarks: bmMap });
                    }

                    const { data: aData } = await supabase.from('annotations').select('*').eq('user_id', user.id);
                    if (aData) {
                        const annMap: Record<string, any[]> = {};
                        aData.forEach(ann => {
                            if (!annMap[ann.book_id]) annMap[ann.book_id] = [];
                            annMap[ann.book_id].push(ann);
                        });
                        set({ annotations: annMap });
                    }
                }

                // Collections Logic
                const systemCollections: Collection[] = [
                    { id: 'all', name: 'All Books', icon: 'Library', color: 'bg-blue-500' },
                    { id: 'favorites', name: 'Favorites', icon: 'Heart', color: 'bg-red-500' },
                    { id: 'reading', name: 'Currently Reading', icon: 'BookOpen', color: 'bg-orange-500' },
                    { id: 'finished', name: 'Finished', icon: 'CheckCircle', color: 'bg-green-500' }
                ];

                let userCollections: Collection[] = [];
                if (user) {
                    const { data: collData } = await supabase.from('collections').select('*').order('name');
                    if (collData) {
                        userCollections = (collData as Collection[]).filter(c => !['all', 'favorites', 'reading', 'finished'].includes(c.id));
                    }
                } else {
                    const stored = localStorage.getItem('mock_collections');
                    if (stored) {
                        userCollections = JSON.parse(stored).filter((c: any) => !['all', 'favorites', 'reading', 'finished'].includes(c.id));
                    }
                }
                set({ collections: [...systemCollections, ...userCollections] });

                if (user) {
                    // Sync settings & stats from profile
                    const { data: profile } = await supabase.from('profiles').select('settings, stats').eq('id', user.id).single();
                    if (profile) {
                        if (profile.settings) {
                            const syncedSettings = { ...profile.settings };
                            // GUARD: Never restore 'split' as persistent mode — it's a temporary session state
                            if (syncedSettings.readingMode === 'split') {
                                syncedSettings.readingMode = 'double-static';
                            }
                            set(state => ({ settings: { ...state.settings, ...syncedSettings } }));
                        }
                        if (profile.stats) set(state => ({ stats: { ...state.stats, ...profile.stats } }));
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
            const t = (key: any) => (translations[currentLang] as any)[key] || key;

            // Limits...
            if (!user && currentBooks.length >= 1) {
                get().triggerGuestLimit();
                toast.error(t('guestLimitReached'));
                return;
            }
            if (user) {
                const role = user.user_metadata?.role || 'Reader';
                if (role !== 'Premium' && role !== 'Admin' && currentBooks.length >= 10) {
                    toast.error(t('freeUploadLimit'));
                    return;
                }
            }

            set({ loading: true });
            try {
                // ... Discovery and Upload logic (Orijinal koddan birebir kopyalandı)
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${user ? user.id : 'guest'}/${fileName}`;

                let finalTitle = meta.title || file.name;
                let finalAuthor = meta.author || '';

                if (!finalAuthor || finalAuthor === '' || finalTitle === file.name) {
                    const localMeta = await extractMetadataLocally(file);
                    if (localMeta) {
                        if (!finalAuthor && localMeta.author) finalAuthor = localMeta.author;
                        if (finalTitle === file.name && localMeta.title) finalTitle = localMeta.title;
                    }
                }

                const displayTitle = smartClean(finalTitle);
                let finalCover = meta.cover_url;

                if (!finalCover) {
                    const localCover = await extractCoverLocally(file).catch(() => null);
                    if (localCover) finalCover = localCover;
                    else {
                        const discovery = await findCoverImage(displayTitle, finalAuthor).catch(() => null);
                        if (discovery?.url && !discovery.url.includes('unsplash')) {
                            finalCover = discovery.url;
                            if (!finalAuthor) finalAuthor = discovery.author || '';
                        }
                    }
                }

                if (!finalCover) finalCover = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";

                // Supabase Upload
                const { error: uploadError } = await supabase.storage.from('books').upload(filePath, file);
                if (uploadError && user) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(filePath);

                await supabase.from('books').insert({
                    user_id: user ? user.id : null,
                    title: displayTitle,
                    author: smartClean(finalAuthor),
                    cover_url: finalCover,
                    file_url: publicUrl,
                    file_type: fileExt === 'pdf' ? 'pdf' : 'epub',
                    file_size: file.size,
                });

                if (!user) {
                    await MockAPI.books.upload(file, { ...meta, title: displayTitle, author: finalAuthor, cover_url: finalCover });
                }

                await get().fetchBooks();
            } finally {
                set({ loading: false });
            }
        },

        deleteBook: async (id) => {
            set({ loading: true });
            try {
                const user = useAuthStore.getState().user;
                const book = get().books.find(b => b.id === id);
                if (user && book?.file_url) {
                    const parts = book.file_url.split('/storage/v1/object/public/books/');
                    if (parts.length > 1) await supabase.storage.from('books').remove([parts[1]]);
                    await supabase.from('books').delete().eq('id', id);
                } else {
                    await MockAPI.books.delete(id);
                }
                await get().fetchBooks();
            } finally {
                set({ loading: false });
            }
        },

        updateProgress: async (id, progress) => {
            const user = useAuthStore.getState().user;
            const now = new Date().toISOString();
            const fullProgress = { ...progress, lastActive: now };

            set(state => ({
                books: state.books.map(b => b.id === id ? { ...b, progress: fullProgress } : b)
            }));

            if (user) {
                await supabase.from('books').update({ progress: fullProgress }).eq('id', id);
            } else {
                await MockAPI.books.updateProgress(id, fullProgress);
            }
        },

        touchLastRead: async (id) => {
            const user = useAuthStore.getState().user;
            const now = new Date().toISOString();
            const book = get().books.find(b => b.id === id);
            if (!book) return;

            const newProgress = { ...(book.progress || { percentage: 0, page: 1 }), lastActive: now };

            set(state => ({
                books: state.books.map(b => b.id === id ? { ...b, progress: newProgress } : b)
            }));

            if (user) {
                await supabase.from('books').update({ progress: newProgress }).eq('id', id);
            } else {
                await MockAPI.books.updateProgress(id, newProgress);
            }
        },

        toggleFavorite: async (id) => {
            const user = useAuthStore.getState().user;
            const book = get().books.find(b => b.id === id);
            if (!book) return;

            const newState = !book.is_favorite;
            set(state => ({
                books: state.books.map(b => b.id === id ? { ...b, is_favorite: newState } : b)
            }));

            if (user) {
                await supabase.from('books').update({ is_favorite: newState }).eq('id', id);
            }
        },

        updateBookTags: async (id, tags) => {
            const user = useAuthStore.getState().user;
            set(state => ({
                books: state.books.map(b => b.id === id ? { ...b, tags } : b)
            }));

            if (user) {
                await supabase.from('books').update({ tags }).eq('id', id);
            }
        },

        setSettings: (newSettings) => {
            const user = useAuthStore.getState().user;
            set(state => {
                const settings = { ...state.settings, ...newSettings };

                // GUARD: Never persist 'split' as default mode — it's a temporary session state
                const settingsToSave = { ...settings };
                if (settingsToSave.readingMode === 'split') {
                    settingsToSave.readingMode = 'double-static';
                }
                localStorage.setItem('reader_settings', JSON.stringify(settingsToSave));

                if (user) {
                    supabase.from('profiles').update({ settings: settingsToSave }).eq('id', user.id).then();
                }
                return { settings }; // In-memory state keeps 'split' for current session
            });
        },

        updateStats: (pagesRead, bookId, timeSpent = 0) => {
            const user = useAuthStore.getState().user;
            set(state => {
                const today = new Date().toISOString().split('T')[0];
                const newStats = { ...state.stats };
                newStats.totalPagesRead += pagesRead;
                newStats.totalReadingTime += timeSpent;
                newStats.dailyPages = { ...newStats.dailyPages, [today]: (newStats.dailyPages[today] || 0) + pagesRead };
                newStats.lastReadDate = today;

                if (bookId) {
                    newStats.bookTime = { ...newStats.bookTime, [bookId]: (newStats.bookTime[bookId] || 0) + timeSpent };
                }

                localStorage.setItem('reader_stats', JSON.stringify(newStats));

                if (user) {
                    supabase.from('profiles').update({ stats: newStats }).eq('id', user.id).then();
                }
                return { stats: newStats };
            });
        },

        addBookmark: async (bookId, location, note) => {
            const user = useAuthStore.getState().user;
            const newBookmark = { id: crypto.randomUUID(), location, note, createdAt: new Date().toISOString() };

            if (user) {
                await supabase.from('bookmarks').insert({ ...newBookmark, book_id: bookId, user_id: user.id });
            }

            set(state => ({
                bookmarks: { ...state.bookmarks, [bookId]: [...(state.bookmarks[bookId] || []), newBookmark] }
            }));
        },

        removeBookmark: async (bookId, bookmarkId) => {
            const user = useAuthStore.getState().user;
            if (user) {
                await supabase.from('bookmarks').delete().eq('id', bookmarkId);
            }
            set(state => ({
                bookmarks: { ...state.bookmarks, [bookId]: (state.bookmarks[bookId] || []).filter(b => b.id !== bookmarkId) }
            }));
        },

        addAnnotation: async (bookId, annotation) => {
            const user = useAuthStore.getState().user;
            const newAnnotation = { ...annotation, id: annotation.id || crypto.randomUUID(), createdAt: new Date().toISOString() };

            if (user) {
                await supabase.from('annotations').insert({ ...newAnnotation, book_id: bookId, user_id: user.id });
            }

            set(state => ({
                annotations: { ...state.annotations, [bookId]: [...(state.annotations[bookId] || []), newAnnotation] }
            }));
        },

        removeAnnotation: async (bookId, id) => {
            const user = useAuthStore.getState().user;
            if (user) {
                await supabase.from('annotations').delete().eq('id', id);
            }
            set(state => ({
                annotations: { ...state.annotations, [bookId]: (state.annotations[bookId] || []).filter(a => a.id !== id) }
            }));
        },

        assignToCollection: async (bookId, collectionId) => {
            const user = useAuthStore.getState().user;
            set(state => ({
                books: state.books.map(b => b.id === bookId ? { ...b, collection_id: collectionId || undefined } : b)
            }));

            if (user) {
                await supabase.from('books').update({ collection_id: collectionId }).eq('id', bookId);
            }
        },

        addCollection: async (collection) => {
            const user = useAuthStore.getState().user;
            if (user) {
                await supabase.from('collections').insert({ ...collection, user_id: user.id });
            } else {
                const stored = localStorage.getItem('mock_collections');
                const cols = stored ? JSON.parse(stored) : [];
                localStorage.setItem('mock_collections', JSON.stringify([...cols, collection]));
            }
            set(state => ({ collections: [...state.collections, collection] }));
        },

        removeCollection: async (id) => {
            const user = useAuthStore.getState().user;
            if (user) {
                await supabase.from('collections').delete().eq('id', id);
            } else {
                const stored = localStorage.getItem('mock_collections');
                if (stored) {
                    const cols = JSON.parse(stored).filter((c: any) => c.id !== id);
                    localStorage.setItem('mock_collections', JSON.stringify(cols));
                }
            }
            set(state => ({
                collections: state.collections.filter(c => c.id !== id),
                books: state.books.map(b => b.collection_id === id ? { ...b, collection_id: undefined } : b)
            }));
        },

        updateCollection: async (id, updates) => {
            const user = useAuthStore.getState().user;
            if (user) {
                await supabase.from('collections').update(updates).eq('id', id);
            } else {
                const stored = localStorage.getItem('mock_collections');
                if (stored) {
                    const cols = JSON.parse(stored).map((c: any) => c.id === id ? { ...c, ...updates } : c);
                    localStorage.setItem('mock_collections', JSON.stringify(cols));
                }
            }
            set(state => ({
                collections: state.collections.map(c => c.id === id ? { ...c, ...updates } : c)
            }));
        }
    };
});

// Initialize BookStore from Cache & Handle Migrations
const savedSettings = localStorage.getItem('reader_settings');
if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    const MIGRATION_KEY = 'reader_v2_migration_done';
    const isMigrated = localStorage.getItem(MIGRATION_KEY);

    if (!isMigrated || settings.readingMode === 'split') {
        settings.readingMode = 'double-static';
        localStorage.setItem('reader_settings', JSON.stringify(settings));
        localStorage.setItem(MIGRATION_KEY, 'true');
    }

    useBookStore.setState(s => ({ settings: { ...s.settings, ...settings } }));
}

const savedStats = localStorage.getItem('reader_stats');
if (savedStats) useBookStore.setState(s => ({ stats: { ...s.stats, ...JSON.parse(savedStats) } }));
