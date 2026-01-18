
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import { translations } from '@/lib/translations';
import LoginPage from '@/pages/Login';
import Layout from '@/components/Layout';
import LibraryPage from '@/pages/Library';
import ReaderPage from '@/pages/ReaderPage';
import BookDetails from '@/pages/BookDetails';
import DiscoverPage from '@/pages/Discover';
import SettingsPage from '@/pages/Settings';
import StatsPage from '@/pages/Stats';
import ReloadPrompt from '@/components/ReloadPrompt';
import { Toaster } from 'sonner';

// Placeholders
import ProfilePage from '@/pages/Profile';

function App() {
  const { user, checkSession, loading } = useAuthStore();

  const { settings } = useBookStore();
  const t = (key: string) => {
    const langKey = settings?.language || 'tr';
    // @ts-ignore
    return (translations[langKey][key] || key);
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center font-serif text-2xl">{t('loading')}...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/read/:id" element={<ReaderPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-right" />
      <ReloadPrompt />
    </BrowserRouter>
  );
}

export default App;
