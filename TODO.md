# Epigraph TODO listesi

Bu dosya projenin geçmişini ve gelecekte yapılacak işleri takip eder. Her başarılı özellik eklemesinden veya hata düzeltmesinden sonra güncellenmelidir.

## ✅ Tamamlananlar
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
- [x] **Sosyal & Paylaşılabilir Özellikler:** Alıntı Kartları tamamlandı.
    - [ ] **Paylaşılabilir Listeler:** Kullanıcıların kitap koleksiyonlarını link ile paylaşabilmesi.
- [ ] **Offline Destek (PWA):** Kitapların internetsiz okunabilmesi.

---
*Gelecek, onu bugünden inşa edenlerindir.*
