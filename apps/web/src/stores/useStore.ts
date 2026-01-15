
import { create } from 'zustand';
import { Book, MockAPI } from '@/lib/mock-api';

interface AuthState {
    user: any | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    checkSession: () => {
        const user = MockAPI.auth.getUser();
        set({ user, loading: false });
    },
    signIn: async () => {
        set({ loading: true });
        const { data } = await MockAPI.auth.signIn();
        set({ user: data.user, loading: false });
    },
    signOut: async () => {
        await MockAPI.auth.signOut();
        set({ user: null });
    }
}));

interface ReaderState {
    settings: {
        fontSize: number;
        fontFamily: string;
        theme: 'light' | 'dark' | 'sepia';
        readingMode: 'single' | 'double' | 'split';
    };
    setSettings: (settings: Partial<ReaderState['settings']>) => void;
    // For split screen, we might need a secondary book ID
    secondaryBookId: string | null;
    setSecondaryBookId: (id: string | null) => void;
}

interface BookState {
    books: Book[];
    loading: boolean;
    fetchBooks: () => Promise<void>;
    uploadBook: (file: File, meta: any) => Promise<void>;
    updateProgress: (id: string, progress: any) => void;
}

export const useBookStore = create<BookState & ReaderState>((set, get) => ({
    books: [],
    loading: false,
    fetchBooks: async () => {
        set({ loading: true });
        try {
            const books = await MockAPI.books.list();
            set({ books });
        } finally {
            set({ loading: false });
        }
    },
    uploadBook: async (file, meta) => {
        set({ loading: true });
        try {
            await MockAPI.books.upload(file, meta);
            await get().fetchBooks(); // Refresh list
        } finally {
            set({ loading: false });
        }
    },
    updateProgress: (id, progress) => {
        MockAPI.books.updateProgress(id, progress);
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, progress } : b)
        }));
    },

    // Reader State
    settings: {
        fontSize: 100,
        fontFamily: 'Inter',
        theme: 'light',
        readingMode: 'single',
    },
    setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
    })),
    secondaryBookId: null,
    setSecondaryBookId: (id) => set({ secondaryBookId: id }),
}));
