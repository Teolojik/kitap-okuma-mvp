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
                    const { data: collData } = await supabase.from('collections').select('*').eq('user_id', user.id).order('name');
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

                        let currentStats = { ...get().stats };
                        if (profile.stats) {
                            currentStats = {
                                ...currentStats,
                                ...profile.stats,
                                // Ensure critical arrays and objects exist
                                dailyPages: profile.stats.dailyPages || {},
                                achievements: profile.stats.achievements || [],
                                bookTime: profile.stats.bookTime || {}
                            };
                        }

                        // CAPTURE DEVICE INFO (Real-time)
                        const userAgent = navigator.userAgent;
                        const platform = navigator.platform;
                        // Simple check to avoid unnecessary updates if nothing changed (optional, but good for perf)
                        // We update 'lastSeen' every time fetchBooks runs (session start)
                        const prevDeviceInfo = (currentStats as any).deviceInfo || {};
                        const newDeviceInfo = {
                            userAgent,
                            platform,
                            lastSeen: new Date().toISOString()
                        };

                        (currentStats as any).deviceInfo = newDeviceInfo;
                        set({ stats: currentStats });

                        // Background update to DB
                        supabase.from('profiles')
                            .update({ stats: currentStats })
                            .eq('id', user.id)
                            .then(({ error }) => {
                                if (error) console.error('[Sync] Device info update failed:', error);
                            });
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

            try {
                if (user) {
                    const { error } = await supabase.from('books').update({ progress: fullProgress }).eq('id', id);
                    if (error) throw error;
                } else {
                    await MockAPI.books.updateProgress(id, fullProgress);
                }
            } catch (e) {
                console.error('[Sync] updateProgress failed:', e);
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

            try {
                if (user) {
                    const { error } = await supabase.from('books').update({ progress: newProgress }).eq('id', id);
                    if (error) throw error;
                } else {
                    await MockAPI.books.updateProgress(id, newProgress);
                }
            } catch (e) {
                console.error('[Sync] touchLastRead failed:', e);
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

            try {
                if (user) {
                    const { error } = await supabase.from('books').update({ is_favorite: newState }).eq('id', id);
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] toggleFavorite failed:', e);
                // Rollback on failure
                set(state => ({
                    books: state.books.map(b => b.id === id ? { ...b, is_favorite: !newState } : b)
                }));
                toast.error('Senkronizasyon hatası. Lütfen tekrar deneyin.');
            }
        },

        updateBookTags: async (id, tags) => {
            const user = useAuthStore.getState().user;
            const oldTags = get().books.find(b => b.id === id)?.tags;
            set(state => ({
                books: state.books.map(b => b.id === id ? { ...b, tags } : b)
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('books').update({ tags }).eq('id', id);
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] updateBookTags failed:', e);
                set(state => ({
                    books: state.books.map(b => b.id === id ? { ...b, tags: oldTags } : b)
                }));
                toast.error('Etiket güncellemesi kaydedilemedi.');
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
                // Use local date for activity tracking to match user's perspective
                const now = new Date();
                const today = now.toLocaleDateString('en-CA');

                const newStats = { ...state.stats };

                // 1. Basic increments
                newStats.totalPagesRead += pagesRead;
                newStats.totalReadingTime += timeSpent;

                // 2. Daily pages tracking
                newStats.dailyPages = {
                    ...newStats.dailyPages,
                    [today]: (newStats.dailyPages[today] || 0) + pagesRead
                };

                // 3. Streak Calculation
                if (pagesRead > 0) {
                    if (!newStats.lastReadDate) {
                        newStats.currentStreak = 1;
                    } else if (newStats.lastReadDate !== today) {
                        const lastDate = new Date(newStats.lastReadDate + 'T00:00:00');
                        const todayDate = new Date(today + 'T00:00:00');
                        const diffTime = todayDate.getTime() - lastDate.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 1) {
                            // Consecutive day
                            newStats.currentStreak += 1;
                        } else {
                            // Streak broken
                            newStats.currentStreak = 1;
                        }
                    }
                    newStats.lastReadDate = today;
                }

                // 4. Book specific time tracking
                if (bookId) {
                    newStats.bookTime = {
                        ...newStats.bookTime,
                        [bookId]: (newStats.bookTime[bookId] || 0) + timeSpent
                    };
                }

                // 5. Achievement Logic (Re-implemented from slice to ensure it works in override)
                const currentAchievements = [...(newStats.achievements || [])];
                const t = (key: string) => (translations[state.settings.language || 'tr'] as any)[key] || key;

                // Bookworm Achievement (10 pages)
                if (newStats.totalPagesRead >= 10 && !currentAchievements.find(a => a.id === 'kitap-kurdu')) {
                    currentAchievements.push({ id: 'kitap-kurdu', unlockedAt: now.toISOString() });
                    toast.success(t('achievementKitapKurduTitle'), { description: t('achievementKitapKurduDesc'), icon: '📚' });
                }

                // Master Reader Achievement (100 pages)
                if (newStats.totalPagesRead >= 100 && !currentAchievements.find(a => a.id === 'usta-okur')) {
                    currentAchievements.push({ id: 'usta-okur', unlockedAt: now.toISOString() });
                    toast.success(t('achievementUstaOkurTitle'), { description: t('achievementUstaOkurDesc'), icon: '🏆' });
                }

                // Night Owl & Streak achievements could be added here too...
                newStats.achievements = currentAchievements;

                // Persistence
                localStorage.setItem('reader_stats', JSON.stringify(newStats));

                if (user) {
                    supabase.from('profiles')
                        .update({ stats: newStats })
                        .eq('id', user.id)
                        .then(({ error }) => {
                            if (error) console.error('[Sync] updateStats Supabase error:', error);
                        });
                }

                return { stats: newStats };
            });
        },

        addBookmark: async (bookId, location, note) => {
            const user = useAuthStore.getState().user;
            const newBookmark = { id: crypto.randomUUID(), location, note, createdAt: new Date().toISOString() };

            set(state => ({
                bookmarks: { ...state.bookmarks, [bookId]: [...(state.bookmarks[bookId] || []), newBookmark] }
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('bookmarks').insert({ ...newBookmark, book_id: bookId, user_id: user.id });
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] addBookmark failed:', e);
                set(state => ({
                    bookmarks: { ...state.bookmarks, [bookId]: (state.bookmarks[bookId] || []).filter(b => b.id !== newBookmark.id) }
                }));
                toast.error('Yer imi kaydedilemedi.');
            }
        },

        removeBookmark: async (bookId, bookmarkId) => {
            const user = useAuthStore.getState().user;
            const removed = (get().bookmarks[bookId] || []).find(b => b.id === bookmarkId);
            set(state => ({
                bookmarks: { ...state.bookmarks, [bookId]: (state.bookmarks[bookId] || []).filter(b => b.id !== bookmarkId) }
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('bookmarks').delete().eq('id', bookmarkId);
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] removeBookmark failed:', e);
                if (removed) {
                    set(state => ({
                        bookmarks: { ...state.bookmarks, [bookId]: [...(state.bookmarks[bookId] || []), removed] }
                    }));
                }
                toast.error('Yer imi silinemedi.');
            }
        },

        addAnnotation: async (bookId, annotation) => {
            const user = useAuthStore.getState().user;
            const newAnnotation = { ...annotation, id: annotation.id || crypto.randomUUID(), createdAt: new Date().toISOString() };

            set(state => ({
                annotations: { ...state.annotations, [bookId]: [...(state.annotations[bookId] || []), newAnnotation] }
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('annotations').insert({
                        id: newAnnotation.id,
                        book_id: bookId,
                        user_id: user.id,
                        data: newAnnotation,
                    });
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] addAnnotation failed:', e);
                set(state => ({
                    annotations: { ...state.annotations, [bookId]: (state.annotations[bookId] || []).filter(a => a.id !== newAnnotation.id) }
                }));
                toast.error('Not kaydedilemedi.');
            }
        },

        removeAnnotation: async (bookId, id) => {
            const user = useAuthStore.getState().user;
            const removed = (get().annotations[bookId] || []).find(a => a.id === id);
            set(state => ({
                annotations: { ...state.annotations, [bookId]: (state.annotations[bookId] || []).filter(a => a.id !== id) }
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('annotations').delete().eq('id', id);
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] removeAnnotation failed:', e);
                if (removed) {
                    set(state => ({
                        annotations: { ...state.annotations, [bookId]: [...(state.annotations[bookId] || []), removed] }
                    }));
                }
                toast.error('Not silinemedi.');
            }
        },

        assignToCollection: async (bookId, collectionId) => {
            const user = useAuthStore.getState().user;
            const oldCollectionId = get().books.find(b => b.id === bookId)?.collection_id;
            set(state => ({
                books: state.books.map(b => b.id === bookId ? { ...b, collection_id: collectionId || undefined } : b)
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('books').update({ collection_id: collectionId }).eq('id', bookId);
                    if (error) throw error;
                }
            } catch (e) {
                console.error('[Sync] assignToCollection failed:', e);
                set(state => ({
                    books: state.books.map(b => b.id === bookId ? { ...b, collection_id: oldCollectionId } : b)
                }));
                toast.error('Koleksiyon ataması kaydedilemedi.');
            }
        },

        addCollection: async (collection) => {
            const user = useAuthStore.getState().user;
            set(state => ({ collections: [...state.collections, collection] }));

            try {
                if (user) {
                    const { error } = await supabase.from('collections').insert({ ...collection, user_id: user.id });
                    if (error) throw error;
                } else {
                    const stored = localStorage.getItem('mock_collections');
                    const cols = stored ? JSON.parse(stored) : [];
                    localStorage.setItem('mock_collections', JSON.stringify([...cols, collection]));
                }
            } catch (e) {
                console.error('[Sync] addCollection failed:', e);
                set(state => ({ collections: state.collections.filter(c => c.id !== collection.id) }));
                toast.error('Koleksiyon oluşturulamadı.');
            }
        },

        removeCollection: async (id) => {
            const user = useAuthStore.getState().user;
            const removedCollection = get().collections.find(c => c.id === id);
            const affectedBooks = get().books.filter(b => b.collection_id === id);
            set(state => ({
                collections: state.collections.filter(c => c.id !== id),
                books: state.books.map(b => b.collection_id === id ? { ...b, collection_id: undefined } : b)
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('collections').delete().eq('id', id);
                    if (error) throw error;
                } else {
                    const stored = localStorage.getItem('mock_collections');
                    if (stored) {
                        const cols = JSON.parse(stored).filter((c: any) => c.id !== id);
                        localStorage.setItem('mock_collections', JSON.stringify(cols));
                    }
                }
            } catch (e) {
                console.error('[Sync] removeCollection failed:', e);
                if (removedCollection) {
                    set(state => ({
                        collections: [...state.collections, removedCollection],
                        books: state.books.map(b => {
                            const was = affectedBooks.find(ab => ab.id === b.id);
                            return was ? { ...b, collection_id: id } : b;
                        })
                    }));
                }
                toast.error('Koleksiyon silinemedi.');
            }
        },

        updateCollection: async (id, updates) => {
            const user = useAuthStore.getState().user;
            const oldCollection = get().collections.find(c => c.id === id);
            set(state => ({
                collections: state.collections.map(c => c.id === id ? { ...c, ...updates } : c)
            }));

            try {
                if (user) {
                    const { error } = await supabase.from('collections').update(updates).eq('id', id);
                    if (error) throw error;
                } else {
                    const stored = localStorage.getItem('mock_collections');
                    if (stored) {
                        const cols = JSON.parse(stored).map((c: any) => c.id === id ? { ...c, ...updates } : c);
                        localStorage.setItem('mock_collections', JSON.stringify(cols));
                    }
                }
            } catch (e) {
                console.error('[Sync] updateCollection failed:', e);
                if (oldCollection) {
                    set(state => ({
                        collections: state.collections.map(c => c.id === id ? oldCollection : c)
                    }));
                }
                toast.error('Koleksiyon güncellenemedi.');
            }
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
