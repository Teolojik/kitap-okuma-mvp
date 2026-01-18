# 📋 Proje Geliştirme Görev Listesi

Bu dosya, Sidebar iyileştirmeleri ve uygulama geneli eksiklikleri takip etmek amacıyla oluşturulmuştur.

## 🏗️ Ana Yapı ve Sayfa Eksikleri (Kritik)
- [x] **Ayarlar Sayfası (Settings Page):** Uygulama genelinde merkezi bir ayarlar sayfasının (`Settings.tsx`) ve rota yapısının kurulması.
    - [x] **Tab Yapısı:** Profil, Görünüm, Okuma Tercihleri, Depolama, Bildirimler ve Destek sekmelerinin oluşturulması.
    - [x] **Profil & Hesap:** Kullanıcı bilgileri, şifre ve istatistik özeti alanı.
    - [x] **Görünüm & Tema:** Global tema (Light/Dark/Sepia) ve dil seçimleri.
    - [x] **Okuma Tercihleri:** Global yazı tipi, boyutu ve sayfa çevirme stili ayarları.
    - [x] **Kütüphane & Depolama:** İndirme tercihleri ve önbellek temizleme yönetimi.
    - [x] **Bildirimler:** Okuma hatırlatıcıları ve duyuru ayarları.
    - [x] **Destek & Bilgi:** Hata bildirimi, sürüm bilgisi ve yasal metinler.
- [x] **Hesap ve Profil Yönetimi:** Kullanıcı bilgilerinin görüntülenebileceği ve düzenlenebileceği alt yapının oluşturulması.

## 🎨 Tasarım ve Görsel Tutarlılık (UI)
- [x] **İkon Uyumu:** El ikonu (Logo) ile diğer fonksiyonel ikonların çizgi kalınlıklarının (stroke) eşitlenmesi.
- [x] **Dikey Hizalama:** Tüm ikonlar arasındaki mesafelerin (spacing) matematiksel olarak dengelenmesi.
- [x] **Separatör Ekleme:** En alttaki "Çıkış" butonu ile üst menü arasına şeffaf ve ince bir ayrım çizgisi eklenmesi.
- [ ] **Karanlık Mod Revizyonu:** Sidebar arka planının her iki modda (light/dark) kontrast ayarlarının kontrol edilmesi.

## ⚙️ Kullanıcı Deneyimi ve Etkileşim (UX)
- [x] **Hover State:** Aktif olmayan ikonlar üzerine gelindiğinde belirecek olan hafif arka plan dolgusu veya renk değişimi.
- [ ] **Tooltips:** İkonların üzerine gelindiğinde fonksiyon adını (Ev, Kitaplık vb.) gösteren ipucu balonlarının eklenmesi.
- [x] **Aktif Gösterge Gelişmiş Tasarım:** Turuncu seçili alanın yanına veya içine, "seçili olma" hissini güçlendirecek ek görsel detaylar (ince yan çizgi vb.).

## ✨ Animasyon ve Akıcılık
- [x] **Geçiş Animasyonları:** Turuncu seçim karesinin sayfalar arası geçişte yumuşak bir şekilde kayarak ilerlemesi (Framer Motion).
- [x] **İkon Mikro-Etkileşimleri:** Hover durumunda ikonların hafifçe ölçeklenmesi (scale) veya hareket etmesi.

## 🚀 Yeni Profesyonel Özellikler
- [x] **Kullanıcı Profili:** Sidebar'ın alt kısmına kullanıcı avatarı veya baş harfleri alanı eklenmesi.
- [x] **Genel Ayarlar:** Uygulama çapındaki ayarlar için Ayarlar (⚙️) butonu eklenmesi.
- [x] **Arama Fonksiyonu:** Kitaplıkta hızlı arama yapmayı sağlayacak Arama (🔍) butonu eklenmesi.
- [x] **İstatistikler & Özet:** Kullanıcının okuma verilerini temsil eden bir grafik veya özet (📊) ikonu.
- [x] **Hızlı Tema Değiştirici:** Ayarlara girmeden Gündüz/Gece modu geçişi sağlayacak buton.
- [x] **Genişletilebilir Menü (Sidebar Expand):** Menünün istendiğinde sağa doğru genişleyerek yazı etiketlerini göstermesi.

## 🚀 Gelecek Planları ve Yeni Fikirler
- [x] **Okuma Dashboard (İstatistikler):** Sidebar'daki grafik ikonuna tıklandığında açılacak, okuma alışkanlıklarını gösteren detaylı analiz sayfası.
- [x] **Gelişmiş Tooltips:** Sidebar kapalıyken ikonların üzerinde belirecek şık ve bilgilendirici ipucu balonları.
- [x] **Karanlık Mod Revizyonu:** Sidebar ve Ayarlar sayfasının karanlık moddaki kontrast ve okunabilirlik ayarlarının mükemmelleştirilmesi.
- [x] **Command Palette (Alt+K):** Uygulama genelinde her yerden erişilebilen hızlı komut ve arama arayüzü.

## 🛠️ Profesyonel Seviye İyileştirmeler (Yeni!)
- [x] **PWA & Offline Desteği:** İnternet yokken de kitap okuyabilmek için "Uygulamayı Yükle" ve çevrimdışı çalışma desteği.
- [x] **Gelişmiş Tipografi Paneli:** Satır aralığı, kenar boşlukları ve paragraf ayarları ile kişiselleştirilmiş okuma.
- [x] **Sesli Okuma (TTS):** Göz yorgunluğunu önlemek için yerleşik yapay zeka seslendirme desteği.
- [x] **Koleksiyonlar & Etiketleme:** Kitapları kategorilere ayırma ve gelişmiş kütüphane organizasyonu.
- [x] **Sözlük & AI Asistanı:** Seçilen kelimenin anlamını görme veya yapay zeka ile paragrafı özetleme.
- [x] **Çok Renkli Vurgulama:** Metinlerin üzerini farklı renklerle çizebilme ve alınan notları dışa aktarma (PDF/Text).

---
## 🛠️ Mevcut Özelliklerin Aktivasyonu ve Teknik Borçlar
- [x] **Drawing System (Çizim):** Kodda mevcut olan `DrawingCanvas` bileşeninin Reader üzerine entegre edilerek Kalem/Silgi araçlarının çalışır hale getirilmesi.
- [x] **Canlı İstatistikler:** Stats sayfasındaki sabit (hardcoded) verilerin, gerçek okuma verileriyle (toplam sayfa, süre, streak) değiştirilmesi.
- [x] **Profil & Favoriler:** Sadece başlık olarak var olan Profil sayfasının ve Favorilere ekleme sisteminin tam işlevsel hale getirilmesi.
- [x] **Ayarlar Senkronizasyonu:** Bildirim ve depolama ayarlarının görselden gerçeğe dönüştürülmesi ve LocalStorage entegrasyonunun güçlendirilmesi.
- [x] **Split Screen İyileştirme:** İkinci kitabın sayfa çevirme ve konum kaydetme mantığının ana kitapla eşitlenmesi.

## 🚀 Gelecek Vizyonu ve Profesyonel Özellikler (Piyasa Araştırması Sonrası)
- [ ] **Gelişmiş Tipografi:** Sadece yan değil, üst ve alt kenar boşluğu (padding) kontrollerinin eklenmesi.
- [ ] **Kitap İçi Arama:** Okunan kitap içerisinde kelime, cümle veya konsept bazlı hızlı arama motoru.
- [ ] **AI Flashcards:** Vurgulanan önemli kısımlardan AI ile otomatik "Anki" tarzı öğrenme kartları oluşturma.
- [ ] **Premium TTS (Yapay Zeka Sesleri):** Standart tarayıcı seslerine ek olarak ElevenLabs veya benzeri doğal insan sesi entegrasyonu.
- [ ] **Notion & Readwise Sync:** Alınan notların ve vurguların doğrudan profesyonel not alma araçlarına aktarılması.
- [ ] **Okuma Isı Haritası (Heatmap):** GitHub tarzı yıllık okuma aktivite takvimi ve detaylı alışkanlık analizi.
- [ ] **Üst Düzey Profesyonel Okuma Deneyimi (Apple/Kindle Seviyesi):**
    - [x] **Odaklanma Modu (Zen Mode):** Okuma başladığında sidebar ve tüm UI'ların otomatik gizlenmesi, sadece etkileşimle geri gelmesi.
    - [x] **Skeuomorphic Kağıt Dokusu:** Sayfalara gerçekçi mikro kağıt lifleri ve katmanlı "sayfa yığını" gölgesi eklenmesi.
    - [ ] **Dinamik Layout:** Başlık ve alt bilgi panellerinin kitapla olan görsel mesafesinin (spacing) altın oran seviyesinde optimize edilmesi.
- [ ] EPUB uyumluluk testleri (Karışık mizanpajlı kitaplarda denemeler yapılması)

### 🌐 Aşama 6: Full-stack Dönüşüm ve Bulut Altyapısı (Profesyonel Platforma Geçiş)

Bu aşama, uygulamanın yerel bir araçtan (offline-first) gerçek bir hizmet portalına (SaaS) dönüşmesini kapsar:

1.  **Gerçek Kimlik Doğrulama (Authentication):**
    *   [ ] E-posta/Şifre ve Google ile giriş sisteminin kurulması (Supabase/Firebase altyapısı).
    *   [ ] Kullanıcı profil yönetimi (Avatar, kullanıcı adı ve kişisel tercihler).

2.  **Bulut Tabanlı Kullanıcı Verisi (Personalized Storage):**
    *   [ ] Kullanıcıların kendi kitaplarını yükleyebileceği merkezi bulut alanı (Storage).
    *   [ ] İlerlemelerin, notların ve istatistiklerin kullanıcı hesabıyla senkronize edilmesi.
    *   [ ] Çapraz cihaz desteği (Bilgisayarda başla, telefonda devam et).

3.  **Yönetim ve Admin Paneli (Admin Console):**
    *   [ ] Platform sahibi (Siz) için özel yönetim paneli.
    *   [ ] Kullanıcı istatistiklerinin (anonimleştirilmiş genel veriler) izlenmesi.
    *   [ ] Platform genelindeki bakım ve güncelleme duyurularının yönetimi.

4.  **Veri Güvenliği ve Performans:**
    *   [ ] Büyük boyutlu PDF/EPUB dosyaları için optimize edilmiş yükleme (Streaming/Buffering).
    *   [ ] Kullanıcı verilerinin güvenli şifreleme ile saklanması.

---
## 🏆 Tam Sürüm (Production Ready) Yol Haritası (100/100 İçin)
- [ ] **Gerçek Yapay Zeka (AI) Motoru:** `ai-service.ts` içindeki mock fonksiyonların OpenAI veya Gemini API'sine bağlanması.
    - [ ] Dinamik kitap özetleme.
    - [ ] Metin bazlı akıllı soru-cevap (QA) sistemi.
- [ ] **Backend & Cloud Sync (Bulut Hafıza):** Kullanıcı verilerinin (kitaplar, çizimler, notlar) Supabase veya Firebase ile cihazlar arası senkronize edilmesi.
    - [ ] Kitapların bulut veritabanına yüklenmesi.
    - [ ] Farklı cihazlardan aynı kaldığı yerden devam edebilme.
- [ ] **İleri Düzey Analitik:** Okuma verilerinin sadece süre değil, tür ve alışkanlık bazında görsel grafiklerle (Recharts vb.) sunulması.
- [ ] **Performans & Ölçeklenebilirlik:**
    - [ ] Çok büyük PDF'ler (500-1000+ sayfa) için "Memory Management" ve "Lazy Loading" optimizasyonu.
    - [ ] Çizim verilerinin boyutunu küçültmek için vektörel (SVG) depolama yöntemine geçiş araştırması.
- [ ] **EPUB Feature Parity:** EPUB okuyucunun PDF'deki (çizim, not, AI) tüm özellikleri %100 destekler hale getirilmesi.

---
*Not: Yeni istekleriniz doğrultusunda bu liste güncellenecektir.*
