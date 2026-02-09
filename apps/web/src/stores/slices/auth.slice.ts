import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface AuthSlice {
    user: any | null;
    loading: boolean;
    signIn: (email?: string, password?: string) => Promise<{ error?: any }>;
    signUp: (email: string, password: string, name: string) => Promise<{ error?: any }>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
    updateProfile: (updates: any) => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    user: null,
    loading: true,
    checkSession: async () => {
        set({ loading: true });
        const { data: { session } } = await supabase.auth.getSession();
        set({ user: session?.user ?? null, loading: false });

        supabase.auth.onAuthStateChange((_event, session) => {
            set({ user: session?.user ?? null });
        });
    },
    signIn: async (email, password) => {
        set({ loading: true });
        if (!email || !password) {
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

        // Clear caches
        localStorage.removeItem('mock_books');
        localStorage.removeItem('epigraph_collections');
        localStorage.removeItem('reader_settings');

        // Clear IndexedDB
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
        const { data } = await supabase.auth.updateUser({
            data: updates
        });
        if (data?.user) {
            set({ user: data.user });
        }
    }
});
