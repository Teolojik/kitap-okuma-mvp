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

## 🧠 State Yönetimi (Zustand)
`apps/web/src/stores/useStore.ts` altında merkezi state yönetilir:
- **Slices:** `authSlice`, `bookSlice`, `readerSlice`.
- **Unified Sync:** `useStore.ts` içinde tüm slice metodları override edilerek Supabase entegrasyonu sağlanır. Her veri değişikliği (ilerleme, favoriler, notlar, ayarlar, koleksiyonlar) anında hem yerel state'i hem de veritabanını günceller.
- **Auth Observer:** `useAuthStore.subscribe` ile kullanıcı oturumu değiştiğinde `fetchBooks()` otomatik tetiklenir, veriler tazelenir.
- **Split Mode Koruması:** `readingMode: 'split'` kalıcılık katmanlarına (localStorage, Supabase) asla yazılmaz; sadece oturum içi geçici state olarak kullanılır.

## ☁️ Veri Katmanı
- **Supabase:** Authentication, PostgreSQL veritabanı (books, profiles, bookmarks, annotations, collections tabloları).
- **Storage:** Kitap dosyaları (.pdf, .epub) ve kapak görselleri (covers bucket).
- **MockAPI:** Anonim (misafir) kullanıcılar için localStorage tabanlı fallback.
