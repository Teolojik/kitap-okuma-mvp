
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { translations } from '@/lib/translations';
import LoginPage from '@/pages/Login';
import Layout from '@/components/Layout';
import LibraryPage from '@/pages/Library';
import ReaderPage from '@/pages/ReaderPage';
import BookDetails from '@/pages/BookDetails';
import DiscoverPage from '@/pages/Discover';
import SettingsPage from '@/pages/Settings';
import StatsPage from '@/pages/Stats';
import AdminPage from '@/pages/Admin';
import AdminGuard from '@/components/AdminGuard';
import ReloadPrompt from '@/components/ReloadPrompt';
import SeoManager from '@/components/SeoManager';
import NotFoundPage from '@/pages/NotFound';
import { Toaster } from 'sonner';
import { Analytics } from "@vercel/analytics/react";

// Placeholders
import ProfilePage from '@/pages/Profile';

function App() {
  const { user, checkSession, loading } = useAuthStore();
  const { settings } = useBookStore();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isCheckingSettings, setIsCheckingSettings] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const t = (key: string) => {
    const langKey = settings?.language || 'tr';
    // @ts-ignore
    return (translations[langKey][key] || key);
  };

  useEffect(() => {
    const initApp = async () => {
      await checkSession();
      try {
        // Check maintenance mode
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'maintenance_mode')
          .single();

        if (settingsData && settingsData.value === true) {
          setIsMaintenance(true);
        }

        // Fetch user role from profiles table
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileData?.role) {
            setUserRole(profileData.role);
          }
        }
      } catch (err) {
        console.error("Failed to check app settings:", err);
      } finally {
        setIsCheckingSettings(false);
      }
    };
    initApp();
  }, []);

  if (loading || isCheckingSettings) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-6 font-black uppercase tracking-[0.3em] text-xs">
        <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        {t('loading')}...
      </div>
    );
  }

  // Maintenance Screen - Check admin status from profiles table (secure)
  const isAdmin = userRole?.toLowerCase() === 'admin' ||
    user?.user_metadata?.role?.toLowerCase() === 'admin';

  if (isMaintenance && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-12">
          <div className="h-32 w-32 rounded-[3.5rem] bg-orange-500/10 flex items-center justify-center relative z-10 animate-pulse">
            <div className="h-16 w-16 border-8 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4 text-[#1A1A1A]">
          {t('maintenanceTitle')}
        </h1>
        <p className="text-[#666] max-w-md font-medium text-lg leading-relaxed">
          {t('maintenanceDesc')}
        </p>
        <div className="mt-12 h-px w-24 bg-orange-500/20" />
      </div>
    );
  }

  return (
    <>
      <Analytics />
      <BrowserRouter>
        <SeoManager />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
            <Route path="/read/:id" element={<ReaderPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="top-right" />
        <ReloadPrompt />
      </BrowserRouter>
    </>
  );
}

export default App;
