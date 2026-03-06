# Epigraph TODO listesi

Bu dosya projenin geçmişini ve gelecekte yapılacak işleri takip eder. Her başarılı özellik eklemesinden veya hata düzeltmesinden sonra güncellenmelidir.

## ✅ Tamamlananlar
- [2026-02-18] **Public Book Catalog Sync Tooling**: `public-books.json` listesini Supabase `public_books` tablosuna upsert eden script eklendi (`seo:sync-public-books`). Opsiyonel prune modu ile listede olmayan yayinlar `unpublish` edilebiliyor (`seo:sync-public-books:prune`).
- [2026-03-07] **PDF Kapak Regresyon Hotfix (v4):** Mor placeholder kapaklarin yeniden yazilmasi engellendi. Backfill extraction fallback'i kapatildi (`allowPlaceholderFallback: false`), blob alma zinciri storage fallback ile guclendirildi ve tum PDF kayitlari guvenli yeniden isleme icin backfill versiyonu artirildi.
- [2026-02-18] **Dinamik Book Sitemap Altyapisi (Feed-Ready)**: `generate-seo-files` scripti local feed (`public-books.json`) ve opsiyonel Supabase `public_books` kaynagini okuyacak sekilde genisletildi. `ENABLE_PUBLIC_BOOK_SITEMAP` bayragi ile ac/kapat modeli eklendi. Public katalog icin SQL setup dosyasi (`supabase/create-public-books-catalog.sql`) eklendi.
- [2026-02-18] **SEO Safety Guard for Book Routes**: `/book/:id` sayfalari public veriyle hydrate olmadigi durumlarda `noindex` korumasina alindi (`SeoManager`). Ek olarak `Vercel` seviyesinde `/book/*` icin `X-Robots-Tag: noindex` eklendi.
- [2026-02-18] **Prerender Coverage Expansion**: Build sonrasi prerender kapsami `/`, `/discover` ve `/404` route'larini kapsayacak sekilde genisletildi; statik host uyumlulugu icin `404.html` ciktisi uretiliyor.
- [2026-02-18] **Search Console Ops Checklist**: Haftalik GSC kontrol adimlari ve issue template akisi `SEO_OPERATIONS.md` dosyasina eklendi.
- [2026-02-18] **SEO Canonical Host + Static Prerender Shell**: `vercel.json` ile non-`www` hosttan `www` hosta 301 yonlendirme eklendi. Build sonrasinda `/discover` icin route-ozel statik HTML shell uretilmeye baslandi (`postbuild` prerender script).
- [2026-02-18] **SEO Hardening v2 (Route Meta + Crawl Control + Automation)**: Route bazli dinamik SEO yonetimi (`SeoManager`) eklendi (title, description, canonical, robots, OG/Twitter), soft-404 yonlendirmesi kaldirildi ve gercek `NotFound` sayfasi eklendi, `Vercel` seviyesinde `X-Robots-Tag` noindex kurallari tanimlandi, `sitemap.xml` ve `robots.txt` build oncesi otomatik uretilir hale getirildi (`prebuild` script), `/details/:id` linkleri `/book/:id` ile duzeltildi.
- [2026-02-18] **PDF/EPUB Kapak Pipeline Stabilizasyonu**: PDF kapak üretimi placeholder akışından çıkarılıp gerçek sayfa render akışına alındı. İlk 3 sayfa tarama + görsel skor yaklaşımı eklendi, `covers` bucket kalıcılığı standartlaştırıldı, upload hatasında data URL fallback korundu, `BookCover` URL değişim reseti ile görsel takılmaları giderildi.
- [2026-02-18] **PDF Kapak Backfill v2**: Mevcut PDF kayıtları için arka plan migration yeniden çalıştırıldı; eski placeholder/data URL kapaklar gerçek kapakla güncellenecek şekilde `fetchBooks` sonrası backfill akışı genişletildi.
- [2026-02-18] **Admin Kullanıcı Detay Paneli Doğrulama**: User drawer'da demo algısı kaldırıldı, toplam kitap sayısı canlı veriden hesaplandı (`userBooks.length`), veri olmayan metriklerde açık empty-state gösterimi eklendi ve legacy `user_id` eksik kitaplar için path fallback ile eşleştirme güçlendirildi.
- [2026-02-15] **Extreme SEO & Schema Dominasyonu**: `sitemap.xml` görsel indeksleme, `index.html` FAQ şeması ve `api/share.js` zengin içerik markup'ları (Quotation, CreativeWork) tamamlandı.
- [2026-02-15] **Alıntı Metni Fix**: PDF ve EPUB seçimlerinde satır sonu tirelerinin (`yardımla- şarak`) otomatik birleştirilmesi sağlandı (`normalizeText`).
- [2026-02-13] **X (Twitter) Görsel Kart Desteği & Güvenlik**: Alıntıların X'te görsel kart olarak paylaşılması için `api/share.js` serverless altyapısı kuruldu. Özellik sadece kayıtlı kullanıcılara kısıtlandı (RLS + UI Lock).
- [2026-02-13] **Admin Panel Modernizasyonu & Misafir Life Cycle**: Admin panelindeki sekmeler optimize edildi (`flex-wrap`, `text-[11px]`), "Anlık Okuyanlar" (Live Readers) sayacı aktifleştirildi (15 dk kısıtıyla), 7 günden eski pasif misafir kitapları için otonom temizlik motoru eklendi.
- [2026-02-13] **İstatistik Görselleştirme Fix**: `Stats.tsx` sayfasındaki haftalık aktivite grafiği, düşük veri durumlarında dahi görünürlük sağlayan minimum yükseklik mantığı ve gelişmiş bar tasarımı (hover tooltip, gradyan) ile güncellendi.
- **[2026-02-13] Alıntı Kartı & Okuyucu Düzeltmeleri:** QuoteModal kompaktlaştırıldı (reader ile çakışma giderildi), annotation `data` JSON pattern'e geçildi (not kaydetme hatası düzeltildi), AI Özetle butonu kaldırıldı, PDF metin seçim gölgesi (`mix-blend-mode: multiply`) düzeltildi.
- **[2026-02-13] Güvenlik & Altyapı Denetimi:** Collections `user_id` filtresi, `AdminGuard` route koruması, merkezi `admin.ts` yetkilendirme modülü, 12 Supabase mutasyonuna try-catch + optimistic rollback, `console.error`/`console.warn` production koruması eklendi.
- **[2026-02-13] Unified Sync & Veri Güvenliği:** Tüm kullanıcı verileri (ayarlar, istatistikler, notlar, vurgular, yer imleri, favoriler, koleksiyonlar) Supabase ile anlık senkronize edildi. Auth Observer ile giriş/çıkış sonrası otomatik veri tazeleme eklendi.
- **[2026-02-13] Split Mode Kök Neden Düzeltmesi:** Bölünmüş ekran modunun kalıcı olarak kaydedilme sorunu 3 katmanlı override zinciri (localStorage → Supabase profil sync → ReaderPage) analiz edilerek çözüldü. `split` modu artık bir oturum durumu (session state) olarak ele alınıyor; `localStorage` ve Supabase'e asla `split` olarak kaydedilmiyor.
- **[2026-02-13] Navigasyon ve Mod Düzeltmeleri:** EPUB re-init loop hatası giderildi, varsayılan okuma modu `double-static` yapıldı. `useStore` seviyesinde veri senkronizasyonu ve mod migration mantığı eklenerek "Devam Et" butonu ve varsayılan mod sorunları çözüldü.
- **[2026-02-13] SEO & Alıntı Kartları:** Open Graph etiketleri, sitemap ve alıntıları resim olarak paylaşma özelliği eklendi.
- **[2026-02-09] Bölünmüş Ekran Navigasyon Düzeltmesi:** İkincil kitabın toplam sayfa takibi ve footer seek mantığı düzeltildi.
- **[2026-02-09] Vibe Coding Altyapısı:** `TODO.md`, `ARCHITECTURE.md`, `KNOWLEDGE.md` ve `.agent/rules.md` yapılandırıldı.
- **[2026-02-08] Store Refactoring:** Zustand store'lar slice'lara ayrılarak modüler hale getirildi.
- **[2026-01-19] PDF Kapak Entegrasyonu:** PDF dosyalarından otomatik kapak çıkarılması ve Supabase Storage'a yüklenmesi sistemi kuruldu.
- **[2026-01-15] Reader UI Restoration:** Sayfa navigasyonu, zoom fonksiyonu ve UI gecikme sorunları giderildi.
- **[2026-01-13] Flipbook Uygulaması:** Kitap çevirme efekti (flipbook) modu eklendi ve layout düzenlemeleri yapıldı.

## 🚀 Planlananlar
- [x] **SEO & Görünürlük Hamlesi:** OG etiketleri, `sitemap.xml`, `robots.txt`.
- [ ] **SEO SSR/Prerender Katmani (Full):** Public route'larin tam icerik prerender/SSR ciktilari (`/`, `/discover`) ve hydration uyumlulugu.
- [ ] **Dinamik Book Sitemap (Production Feed):** `public_books` tablosunun production'da populate edilmesi ve `ENABLE_PUBLIC_BOOK_SITEMAP=true` ile yayina alinmasi.
- [ ] **Public Book Detail Modeli:** `/book/:id` URL'lerinin indexlenebilir olabilmesi icin public-access veri modeli + SSR/prerender veri kaynagi.
- [x] **Sosyal & Paylaşılabilir Özellikler:** Alıntı Kartları tamamlandı.
    - [ ] **Paylaşılabilir Listeler:** Kullanıcıların kitap koleksiyonlarını link ile paylaşabilmesi.
- [ ] **Offline Destek (PWA):** Kitapların internetsiz okunabilmesi.

---
*Gelecek, onu bugünden inşa edenlerindir.*
