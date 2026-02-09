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

export const useBookStore = create<BookSlice & ReaderSlice>()((set, get, api) => ({
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
                    if (profile.settings) set(state => ({ settings: { ...state.settings, ...profile.settings } }));
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

    // Auth-aware overrides for Reader Slice
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
    // ... other sync methods will be added as needed, or kept unified
}));

// Initialize BookStore from Cache
const savedSettings = localStorage.getItem('reader_settings');
if (savedSettings) useBookStore.setState(s => ({ settings: { ...s.settings, ...JSON.parse(savedSettings) } }));

const savedStats = localStorage.getItem('reader_stats');
if (savedStats) useBookStore.setState(s => ({ stats: { ...s.stats, ...JSON.parse(savedStats) } }));
