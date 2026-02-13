# Epigraph TODO listesi

Bu dosya projenin geçmişini ve gelecekte yapılacak işleri takip eder. Her başarılı özellik eklemesinden veya hata düzeltmesinden sonra güncellenmelidir.

## ✅ Tamamlananlar
- **[2026-02-13] Navigasyon ve Mod Düzeltmeleri:** EPUB re-init loop hatası giderildi, varsayılan okuma modu `double-static` yapıldı ve ref yönetimi modernize edildi. `useStore` seviyesinde veri senkronizasyonu (Database Sync) ve mod migration mantığı eklenerek "Devam Et" butonu ve varsayılan mod sorunları kökten çözüldü.
- **[2026-02-13] SEO & Alıntı Kartları:** Open Graph etiketleri, sitemap ve alıntıları resim olarak paylaşma özelliği eklendi. Alıntı kartından kapak kaldırılarak minimalist tasarıma geçildi.
- **[2026-02-09] Bölünmüş Ekran Navigasyon Düzeltmesi:** İkincil kitabın toplam sayfa takibi (`onSecondaryTotalPages`) ve footer seek mantığı (EPUB dahil) düzeltildi.
- **[2026-02-09] Vibe Coding Altyapısı:** `TODO.md`, `ARCHITECTURE.md`, `KNOWLEDGE.md` ve `.agent/rules.md` yapılandırıldı.
- **[2026-02-08] Store Refactoring:** Zustand store'lar slice'lara ayrılarak modüler hale getirildi.
- **[2026-02-08] Modernizasyon Hamlesi:** Proje genelinde tip güvenliği ve dosya isimlendirme standartları uygulandı.
- **[2026-01-19] PDF Kapak Entegrasyonu:** PDF dosyalarından otomatik kapak çıkarılması ve Supabase Storage'a yüklenmesi sistemi kuruldu.
- **[2026-01-15] Reader UI Restoration:** Sayfa navigasyonu, zoom fonksiyonu ve UI gecikme sorunları giderildi.
- **[2026-01-13] Flipbook Uygulaması:** Kitap çevirme efekti (flipbook) modu eklendi ve layout düzenlemeleri yapıldı.

## 🚀 Planlananlar
- [x] **SEO & Görünürlük Hamlesi:**
    - [x] Open Graph (OG) etiketleri ile X/Meta paylaşım kartlarını optimize et.
    - [x] `sitemap.xml` ve `robots.txt` entegrasyonu.
- [x] **Sosyal & Paylaşılabilir Özellikler:**
    - [x] **Alıntı Kartları:** Seçilen metinleri şık görsellere dönüştürüp link ile paylaşma.
    - [ ] **Paylaşılabilir Listeler:** Kullanıcıların kitap koleksiyonlarını link ile paylaşabilmesi
- [ ] **Offline Destek (PWA):** Kitapların internetsiz okunabilmesi.

---
*Gelecek, onu bugünden inşa edenlerindir.*
