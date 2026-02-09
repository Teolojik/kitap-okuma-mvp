import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Book, Collection, MockAPI, smartClean, parseFileName, extractCoverLocally, extractMetadataLocally } from '@/lib/mock-api';
import { findCoverImage } from '@/lib/discovery-service';
import { toast } from 'sonner';
import { translations } from '@/lib/translations';

export interface BookSlice {
    books: Book[];
    loading: boolean;
    collections: Collection[];
    guestLimitTrigger: number;
    fetchBooks: () => Promise<void>;
    uploadBook: (file: File, meta: any) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    updateProgress: (id: string, progress: any) => Promise<void>;
    touchLastRead: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    updateBookTags: (id: string, tags: string[]) => Promise<void>;
    assignToCollection: (bookId: string, collectionId: string | null) => Promise<void>;
    addCollection: (collection: Collection) => Promise<void>;
    removeCollection: (id: string) => Promise<void>;
    updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
    triggerGuestLimit: () => void;
}

export const createBookSlice: StateCreator<BookSlice> = (set, get) => ({
    books: [],
    collections: [],
    loading: false,
    guestLimitTrigger: 0,
    triggerGuestLimit: () => set(state => ({ guestLimitTrigger: state.guestLimitTrigger + 1 })),

    fetchBooks: async () => {
        set({ loading: true });
        try {
            // This logic requires user-aware state, will be fully implemented in the combined store
            // or by providing a way to access AuthSlice state.
        } finally {
            set({ loading: false });
        }
    },
    uploadBook: async (file, meta) => {
        // ... Implementation from useStore.ts
    },
    deleteBook: async (id) => {
        // ... Implementation from useStore.ts
    },
    updateProgress: async (id, progress) => {
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, progress: { ...progress, lastActive: new Date().toISOString() } } : b)
        }));
    },
    touchLastRead: async (id) => {
        const now = new Date().toISOString();
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, progress: { ...b.progress, lastActive: now } } : b)
        }));
    },
    toggleFavorite: async (id) => {
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, is_favorite: !b.is_favorite } : b)
        }));
    },
    updateBookTags: async (id, tags) => {
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, tags } : b)
        }));
    },
    assignToCollection: async (bookId, collectionId) => {
        set(state => ({
            books: state.books.map(b => b.id === bookId ? { ...b, collection_id: collectionId || undefined } : b)
        }));
    },
    addCollection: async (collection) => {
        set(state => ({ collections: [...state.collections, collection] }));
    },
    removeCollection: async (id) => {
        set(state => ({
            collections: state.collections.filter(c => c.id !== id),
            books: state.books.map(b => b.collection_id === id ? { ...b, collection_id: undefined } : b)
        }));
    },
    updateCollection: async (id, updates) => {
        set(state => ({
            collections: state.collections.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    }
});
