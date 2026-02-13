import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { translations } from '@/lib/translations';
import { MockAPI } from '@/lib/mock-api';

export interface ReaderSlice {
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
    setSettings: (settings: Partial<ReaderSlice['settings']>) => void;
    secondaryBookId: string | null;
    setSecondaryBookId: (id: string | null) => void;

    bookmarks: Record<string, Array<{ id: string; location: string; note?: string; createdAt: string }>>;
    addBookmark: (bookId: string, location: string, note?: string) => Promise<void>;
    removeBookmark: (bookId: string, bookmarkId: string) => Promise<void>;

    annotations: Record<string, Array<{
        id: string;
        cfiRange: string;
        text: string;
        color: string;
        note?: string;
        createdAt: string;
        type: 'highlight' | 'note';
    }>>;
    addAnnotation: (bookId: string, annotation: any) => Promise<void>;
    removeAnnotation: (bookId: string, id: string) => Promise<void>;

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
    saveDrawing: (pageKey: string, data: string) => Promise<void>;
    fetchDrawingsForBook: (bookId: string) => Promise<void>;
}

export const createReaderSlice: StateCreator<ReaderSlice> = (set, get) => ({
    settings: {
        fontSize: 100,
        fontFamily: 'Inter',
        theme: 'sepia',
        readingMode: 'double-static',
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

            // Sync settings to Supabase Profile (Assumes auth state is accessible or handled elsewhere)
            // In a real slice pattern, you'd use a combined store or access auth via get() if typed correctly
            return { settings };
        });
    },
    secondaryBookId: null,
    setSecondaryBookId: (id) => set({ secondaryBookId: id }),

    bookmarks: {},
    addBookmark: async (bookId, location, note) => {
        const newBookmark = { id: crypto.randomUUID(), location, note, createdAt: new Date().toISOString() };

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
        const newAnnotation = { ...annotation, id: annotation.id || crypto.randomUUID(), createdAt: new Date().toISOString() };

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
                let text = (translations[currentLang] as any)[key] || key;
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
        });
    },
    drawings: {},
    saveDrawing: async (pageKey, data) => {
        set(state => ({
            drawings: { ...state.drawings, [pageKey]: data }
        }));

        try {
            await MockAPI.drawings.save(pageKey, data);
        } catch (dbErr) {
            localStorage.setItem(`drawing_${pageKey}`, data);
        }
    },
    fetchDrawingsForBook: async (bookId) => {
        try {
            const localData = await MockAPI.drawings.listForBook(bookId);
            if (Object.keys(localData).length > 0) {
                set(state => ({
                    drawings: { ...state.drawings, ...localData }
                }));
            }
        } catch (err) {
            console.error('Local drawing fetch failed:', err);
        }
    },
});
