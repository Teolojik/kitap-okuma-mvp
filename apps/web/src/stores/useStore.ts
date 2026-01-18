
import { create } from 'zustand';
import { Book, Collection, MockAPI } from '@/lib/mock-api';
import { toast } from 'sonner';
import { translations } from '@/lib/translations';

interface AuthState {
    user: any | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => void;
    updateProfile: (updates: any) => Promise<void>;
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
    },
    updateProfile: async (updates: any) => {
        const { data } = await MockAPI.auth.updateProfile(updates);
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
        language: 'tr' | 'en';
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
}

interface BookState {
    books: Book[];
    loading: boolean;
    fetchBooks: () => Promise<void>;
    uploadBook: (file: File, meta: any) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    updateProgress: (id: string, progress: any) => void;
    toggleFavorite: (id: string) => Promise<void>;
    updateBookTags: (id: string, tags: string[]) => Promise<void>;
    assignToCollection: (bookId: string, collectionId: string | null) => Promise<void>;
    collections: Collection[];
    addCollection: (collection: Collection) => Promise<void>;
    removeCollection: (id: string) => Promise<void>;
    updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
}

export const useBookStore = create<BookState & ReaderState>((set, get) => ({
    books: [],
    collections: [],
    loading: false,
    fetchBooks: async () => {
        set({ loading: true });
        try {
            const books = await MockAPI.books.list();
            const storedCollections = localStorage.getItem('mock_collections');
            const collections = storedCollections ? JSON.parse(storedCollections) : [
                { id: 'all', name: 'All Books', icon: 'Library', color: 'bg-blue-500' },
                { id: 'favorites', name: 'Favorites', icon: 'Heart', color: 'bg-red-500' },
                { id: 'reading', name: 'Currently Reading', icon: 'BookOpen', color: 'bg-orange-500' },
                { id: 'finished', name: 'Finished', icon: 'CheckCircle', color: 'bg-green-500' }
            ];
            if (!storedCollections) localStorage.setItem('mock_collections', JSON.stringify(collections));
            set({ books, collections });
        } finally {
            set({ loading: false });
        }
    },
    uploadBook: async (file, meta) => {
        set({ loading: true });
        try {
            await MockAPI.books.upload(file, meta);
            await get().fetchBooks();
        } finally {
            set({ loading: false });
        }
    },
    deleteBook: async (id) => {
        set({ loading: true });
        try {
            await MockAPI.books.delete(id);
            await get().fetchBooks();
        } finally {
            set({ loading: false });
        }
    },
    updateProgress: (id, progress) => {
        // Track stats when progress updates (assumes 1 page read if page changed)
        const oldBook = get().books.find(b => b.id === id);
        if (oldBook && oldBook.progress?.page !== progress.page) {
            get().updateStats(1, id, 0);
        }

        MockAPI.books.updateProgress(id, progress);
        set(state => ({
            books: state.books.map(b => b.id === id ? { ...b, progress } : b)
        }));
    },

    toggleFavorite: async (id) => {
        const books = get().books.map(b => b.id === id ? { ...b, isFavorite: !b.isFavorite } : b);
        localStorage.setItem('mock_books', JSON.stringify(books));
        set({ books });
    },

    updateBookTags: async (id, tags) => {
        const books = get().books.map(b => b.id === id ? { ...b, tags } : b);
        localStorage.setItem('mock_books', JSON.stringify(books));
        set({ books });
    },

    assignToCollection: async (bookId, collectionId) => {
        const books = get().books.map(b => b.id === bookId ? { ...b, collectionId: collectionId || undefined } : b);
        localStorage.setItem('mock_books', JSON.stringify(books));
        set({ books });
    },

    addCollection: async (collection) => {
        const collections = [...get().collections, collection];
        localStorage.setItem('mock_collections', JSON.stringify(collections));
        set({ collections });
    },

    removeCollection: async (id) => {
        const collections = get().collections.filter(c => c.id !== id);
        const books = get().books.map(b => b.collectionId === id ? { ...b, collectionId: undefined } : b);
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
        language: 'tr',
    },
    setSettings: (newSettings) => set((state) => {
        const updated = { ...state.settings, ...newSettings };
        localStorage.setItem('reader_settings', JSON.stringify(updated));
        return { settings: updated };
    }),
    secondaryBookId: null,
    setSecondaryBookId: (id) => set({ secondaryBookId: id }),

    bookmarks: {},
    addBookmark: (bookId, location, note) => set(state => {
        const bookBookmarks = state.bookmarks[bookId] || [];
        return {
            bookmarks: {
                ...state.bookmarks,
                [bookId]: [...bookBookmarks, { id: crypto.randomUUID(), location, note, createdAt: new Date().toISOString() }]
            }
        };
    }),
    removeBookmark: (bookId, bookmarkId) => set(state => {
        const bookBookmarks = state.bookmarks[bookId] || [];
        return {
            bookmarks: {
                ...state.bookmarks,
                [bookId]: bookBookmarks.filter(b => b.id !== bookmarkId)
            }
        };
    }),

    annotations: {},
    addAnnotation: (bookId, annotation) => set(state => {
        const bookAnnotations = state.annotations[bookId] || [];
        const newAnnotation = { ...annotation, id: annotation.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
        return {
            annotations: {
                ...state.annotations,
                [bookId]: [...bookAnnotations, newAnnotation]
            }
        };
    }),
    removeAnnotation: (bookId, id) => set(state => {
        const bookAnnotations = state.annotations[bookId] || [];
        return {
            annotations: {
                ...state.annotations,
                [bookId]: bookAnnotations.filter(a => a.id !== id)
            }
        };
    }),

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
    updateStats: (pagesRead, bookId, timeSpent = 0) => set(state => {
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
        return { stats: newStats };
    }),
    drawings: {},
    saveDrawing: (pageKey, data) => set(state => {
        const newDrawings = { ...state.drawings, [pageKey]: data };
        localStorage.setItem('reader_drawings', JSON.stringify(newDrawings));
        return { drawings: newDrawings };
    }),
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
