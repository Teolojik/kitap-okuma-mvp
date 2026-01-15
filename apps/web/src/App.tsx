
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useStore';
import LoginPage from '@/pages/Login';
import Layout from '@/components/Layout';
import LibraryPage from '@/pages/Library';
import ReaderPage from '@/pages/ReaderPage';
import DiscoverPage from '@/pages/Discover';
import ReloadPrompt from '@/components/ReloadPrompt';
import { Toaster } from 'sonner';

// Placeholders
const Profile = () => <div>Profil Sayfası (Yapım Aşamasında)</div>;

function App() {
  const { user, checkSession, loading } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/read/:id" element={<ReaderPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        )}
      </Routes>
      <Toaster position="top-right" />
      <ReloadPrompt />
    </BrowserRouter>
  );
}

export default App;
