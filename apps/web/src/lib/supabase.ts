import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Güvenli başlatma: Eğer değişkenler eksikse boş string yerine geçersiz ama çökertmeyen değerler kullanıyoruz
// Veya daha iyisi, bir Proxy/Mock döndürebiliriz ama şimdilik en azından çökmesini engelleyelim.
const isMissingKey = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL';

if (isMissingKey) {
    console.warn('⚠️ Supabase credentials are missing or invalid. App will run in MOCK mode only.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);
