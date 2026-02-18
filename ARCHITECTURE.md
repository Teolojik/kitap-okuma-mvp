# Epigraph Architecture

Bu dosya projenin teknik yapısını ve bileşenler arasındaki ilişkileri açıklar.

## 🏗️ Genel Yapı
Proje bir Monorepo yapısındadır:
- `apps/web`: Next.js tabanlı ana okuyucu uygulaması.
- `packages/*`: Paylaşılan yardımcı fonksiyonlar ve UI kütüphaneleri.

## 📚 Reader Hiyerarşisi
Okuyucu sayfası (`ReaderPage.tsx`) şu hiyerarşiyle yönetilir:
1.  **ReaderPage:** Ana container, state yönetimi (activePanel, settings, books) ve ana UI öğeleri (Header, Footer, modallar).
2.  **ReaderContainer:** Birincil ve ikincil kitapların koordinasyonunu sağlar.
3.  **SplitScreenReader:** İki bağımsız okuyucuyu yan yana render eder.
4.  **PdfReader / EpubReader:** Formata özel render motorları (`pdfjs` ve `epub.js`).
5.  **SelectionToolbar:** Metin seçildiğinde çıkan araç çubuğu (AI, Not, Alıntı Paylaş).
6.  **QuoteModal & QuoteCard:** Alıntıları görsele dönüştüren paylaşım sistemi.
7.  **Re-init Protection:** `useMemo` ile sabitlenen render seçenekleri ve local ref yönetimi sayesinde EPUB/PDF motorlarının kararlı çalışması sağlanır.
18. **Selection-Aware Navigation:** Okuyucu üzerindeki tüm navigasyon katmanları (tap-to-navigate, yan butonlar) `window.getSelection()` durumuna duyarlıdır.
    - **Seçim-Duyarlı Navigasyon**: Metin seçimi algılandığında navigasyon butonları pasifleşerek kullanıcı deneyimi korunur.
    - **Yerel Tarih Önceliği**: Okuma istatistikleri ve aktivite grafikleri için her zaman kullanıcının yerel zaman dilimi (`en-CA` formatı) baz alınır.
    - **Envanter Sıralaması**: Yönetim araçlarında tüm global veriler (kullanıcılar, içerikler) kronolojik olarak en yeniden eskiye doğru sıralanır.
    - **Minimum Grafik Tasarımı**: İstatistik sayfalarındaki barlar, veri az olsa dahi minimum %5 yükseklik ve interaktif tooltipler ile görselleştirilir.
20. **Admin Panel Architecture:** Yönetim paneli artık modüler ve analiz tabanlı bir yapıya sahiptir:
    - **ActivityStream:** Tüm sistem loglarını kronolojik bir zaman çizelgesinde sunar.
    - **UserDetailDrawer:** Kullanıcı listesinden erişilen, derinlemesine okuma alışkanlığı ve cihaz analizi sunan yan panel.
    - **UserDetailDrawer Data Integrity:** Detay paneli demo veri göstermez; `books`, `book_progress` ve kullanıcı aktivite verilerinden canlı hesap üretir, veri yoksa "no data" durumuna düşer.
    - **StorageChart:** Platformun depolama kaynaklarını Recharts (Pie & Bar) ile görselleştiren analiz modülü.
    - **Storage Cleanup Modülü:** Veritabanı ve fiziksel storage arasındaki senkronizasyonu tarayan temizlik motoru.
    - **Guest Life Cycle Motoru:** Kayıtlı olmayan kullanıcıların 7 günden eski pasif içeriklerini otomatik temizleyen otonom yapı.
    - **Social Share API (Vercel):** Dinamik Open Graph meta taglerini sunan, X/Twitter crawler dostu serverless katmanı.
    - **SEO & Search Dominasyon**: JSON-LD (SoftwareApp, FAQ, Quotation) markup'ları ve zenginleştirilmiş `sitemap.xml` (Image indexing).
    - **Content Normalization Engine**: `lib/utils` altında tireli satır sonlarını ve whitespace bozukluklarını ayıklayan merkezi metin işleme katmanı.

## 🧠 State Yönetimi (Zustand)
`apps/web/src/stores/useStore.ts` altında merkezi state yönetilir:
- **Slices:** `authSlice`, `bookSlice`, `readerSlice`.
- **Unified Sync:** `useStore.ts` içinde tüm slice metodları override edilerek Supabase entegrasyonu sağlanır. Her veri değişikliği (ilerleme, favoriler, notlar, ayarlar, koleksiyonlar) anında hem yerel state'i hem de veritabanını günceller.
- **Auth Observer:** `useAuthStore.subscribe` ile kullanıcı oturumu değiştiğinde `fetchBooks()` otomatik tetiklenir, veriler tazelenir.
- **Split Mode Koruması:** `readingMode: 'split'` kalıcılık katmanlarına (localStorage, Supabase) asla yazılmaz; sadece oturum içi geçici state olarak kullanılır.

## ☁️ Veri Katmanı
- **Supabase:** Authentication, PostgreSQL veritabanı (books, profiles, bookmarks, annotations, collections tabloları).
- **Storage:** Kitap dosyaları (.pdf, .epub), kapak görselleri (covers bucket) ve paylaşılan alıntı kartları (shares bucket - authenticated upload only).
- **Cover Pipeline:** PDF yüklemelerinde kapak görseli için placeholder yerine gerçek sayfa render akışı kullanılır. İlk 3 sayfa taranır, en görsel olarak güçlü aday seçilir, `covers` bucket'a yazılır; upload hatasında data URL fallback devreye girer.
- **MockAPI:** Anonim (misafir) kullanıcılar için localStorage tabanlı fallback.
- **Background Backfill:** `fetchBooks` sonrasında arka planda PDF kapak backfill çalışır; eski placeholder/data URL kayıtları gerçek kapağa çevrilerek kalıcılaştırılır.
- **Hata Yönetimi:** Tüm Supabase mutasyonlarında optimistic rollback pattern — hata durumunda yerel state geri alınır, kullanıcıya Türkçe toast gösterilir.

## 🔒 Güvenlik
- **Admin Guard:** `AdminGuard.tsx` ile `/admin` route'u korunur. Merkezi `admin.ts` modülü üzerinden yetkilendirme yapılır.
- **Veri İzolasyonu:** Collections ve bookmarks sorguları `user_id` filtresiyle korunur.
- **Production Logging:** Sadece `console.log` kaldırılır; `console.error`/`console.warn` hata izleme için korunur.

