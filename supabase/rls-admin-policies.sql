-- =====================================================
-- SUPABASE RLS POLİTİKALARI - ADMİN ERİŞİMİ
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın
-- =====================================================

-- ANNOTATIONS Tablosu için Admin Politikaları
DROP POLICY IF EXISTS "annotations_select_policy" ON public.annotations;
DROP POLICY IF EXISTS "annotations_delete_policy" ON public.annotations;

CREATE POLICY "annotations_select_policy" ON public.annotations
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "annotations_delete_policy" ON public.annotations
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- BOOKMARKS Tablosu için Admin Politikaları
DROP POLICY IF EXISTS "bookmarks_select_policy" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_delete_policy" ON public.bookmarks;

CREATE POLICY "bookmarks_select_policy" ON public.bookmarks
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "bookmarks_delete_policy" ON public.bookmarks
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- COLLECTIONS Tablosu için Admin Politikaları
DROP POLICY IF EXISTS "collections_select_policy" ON public.collections;
DROP POLICY IF EXISTS "collections_delete_policy" ON public.collections;

CREATE POLICY "collections_select_policy" ON public.collections
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "collections_delete_policy" ON public.collections
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- DRAWINGS Tablosu için Admin Politikaları  
DROP POLICY IF EXISTS "drawings_select_policy" ON public.drawings;
DROP POLICY IF EXISTS "drawings_delete_policy" ON public.drawings;

CREATE POLICY "drawings_select_policy" ON public.drawings
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "drawings_delete_policy" ON public.drawings
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- SUPPORT_TICKETS Tablosu için Admin Politikaları
DROP POLICY IF EXISTS "support_tickets_select_policy" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_policy" ON public.support_tickets;

CREATE POLICY "support_tickets_select_policy" ON public.support_tickets
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "support_tickets_update_policy" ON public.support_tickets
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "support_tickets_delete_policy" ON public.support_tickets
FOR DELETE USING (public.is_admin());

-- ADMIN_LOGS Tablosu (Sadece Adminler görebilir)
DROP POLICY IF EXISTS "admin_logs_select_policy" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_insert_policy" ON public.admin_logs;

CREATE POLICY "admin_logs_select_policy" ON public.admin_logs
FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_logs_insert_policy" ON public.admin_logs
FOR INSERT WITH CHECK (public.is_admin());

-- ANNOUNCEMENTS Tablosu (Herkes okuyabilir, sadece admin yazabilir)
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_policy" ON public.announcements;

CREATE POLICY "announcements_select_policy" ON public.announcements
FOR SELECT USING (true); -- Herkes duyuruları görebilir

CREATE POLICY "announcements_insert_policy" ON public.announcements
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "announcements_update_policy" ON public.announcements
FOR UPDATE USING (public.is_admin());

CREATE POLICY "announcements_delete_policy" ON public.announcements
FOR DELETE USING (public.is_admin());

-- SYSTEM_SETTINGS Tablosu (Sadece Adminler)
DROP POLICY IF EXISTS "system_settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_policy" ON public.system_settings;

CREATE POLICY "system_settings_select_policy" ON public.system_settings
FOR SELECT USING (true); -- Herkes okuyabilir (maintenance mode kontrolü için)

CREATE POLICY "system_settings_update_policy" ON public.system_settings
FOR UPDATE USING (public.is_admin());

-- =====================================================
-- NOT: Bu SQL'i çalıştırmadan önce is_admin() fonksiyonunun
-- var olduğundan emin olun. Yoksa şu komutu önce çalıştırın:
-- 
-- CREATE OR REPLACE FUNCTION public.is_admin()
-- RETURNS boolean
-- LANGUAGE sql
-- SECURITY DEFINER
-- STABLE
-- AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE id = auth.uid() AND role = 'Admin'
--   );
-- $$;
-- =====================================================
