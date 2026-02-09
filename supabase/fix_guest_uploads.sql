-- 1. Books tablosunu Misafir (Anonim) kitaplara izin verecek şekilde güncelle
ALTER TABLE public.books ALTER COLUMN user_id DROP NOT NULL;

-- 2. Eski kısıtlayıcı politikaları kaldır
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
DROP POLICY IF EXISTS "Users can insert their own books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;

-- 3. Yeni Genişletilmiş Politikalar (Adminler + Misafirler Dahil)

-- GÖRÜNTÜLEME:
-- Adminler HER ŞEYİ görür.
-- Kullanıcılar KENDİ kitaplarını görür.
-- Anonim (Misafir) kullanıcılar şu an sadece kendi oturumlarında (local) görüyor ama
-- eğer ileride sunucudan çekmek isterseler user_id'si NULL olanları belki görebilmeli?
-- Şimdilik güvenli olan: Admin her şeyi görür, User kendininkini.
CREATE POLICY "Enhanced view policy"
ON public.books FOR SELECT
USING (
  (auth.uid() = user_id) OR (public.is_admin())
);

-- EKLEME (INSERT):
-- Authenticated kullanıcılar kendi ID'siyle ekler.
-- Anonim (Misafir) kullanıcılar user_id'si NULL olarak ekleyebilir.
CREATE POLICY "Enhanced insert policy"
ON public.books FOR INSERT
WITH CHECK (
  (auth.role() = 'anon' AND user_id IS NULL) OR
  (auth.uid() = user_id)
);

-- GÜNCELLEME:
-- Sadece sahibi veya Admin
CREATE POLICY "Enhanced update policy"
ON public.books FOR UPDATE
USING ( (auth.uid() = user_id) OR (public.is_admin()) );

-- SİLME:
-- Sadece sahibi veya Admin
CREATE POLICY "Enhanced delete policy"
ON public.books FOR DELETE
USING ( (auth.uid() = user_id) OR (public.is_admin()) );


-- 4. STORAGE (DOSYA YÜKLEME) İZİNLERİ
-- Storage policy'lerini güncellememiz lazım çünkü misafirlerin de dosya yüklemesi gerek.

-- Önce eski politikaları temizleyelim (Çakışma olmasın)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view own files" ON storage.objects;

-- YENİ STORAGE POLİTİKALARI

-- Herkes (Misafir dahil) 'books' klasörüne dosya yükleyebilir
CREATE POLICY "Universal upload policy"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'books' );

-- Görüntüleme: Herkes public dosyaları görebilir (zaten public bucket ama garanti olsun)
CREATE POLICY "Universal view policy"
ON storage.objects FOR SELECT
USING ( bucket_id = 'books' );

-- Silme: Sadece Admin veya dosya sahibi (Auth user)
CREATE POLICY "Secure delete policy"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'books' AND (
    (auth.uid() = owner) OR (public.is_admin())
  )
);
