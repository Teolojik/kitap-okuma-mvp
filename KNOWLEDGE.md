# Epigraph Knowledge Base

Zor yoldan öğrenilen dersler ve kritik teknik çözümler burada toplanır.

## 🛠️ Teknik Çözümler

### 1. Dosya Eşleşme Hataları (Multi-Replace)
**Sorun:** `multi_replace_file_content` gibi araçların görünmeyen karakterler veya karmaşık girintiler nedeniyle eşleşme hatası vermesi.
**Çözüm:** Standart araçlarda takılmak yerine, `fs.readFileSync` ve regex kullanan geçici bir Node.js betiği yazarak dosyayı doğrudan manipüle etmek en güvenli yoldur (`fix_reader_page.js` örneği).

### 2. EPUB Navigasyon Mantığı
**Öğrenilen:** EPUB formatında sayfa numarası konsepti değişkendir (font boyutuna göre değişir). Bu nedenle navigasyon her zaman "yüzde (%)" veya "CFI (Content Fragment Identifier)" üzerinden yapılmalıdır.
**Seek Uygulaması:** İkincil kitap için `goToSecondaryPercentage` gibi metodlar marifetiyle `epub.js`'nin `rendition.display()` fonksiyonu yüzde parametresiyle çağrılmalıdır.

### 3. Vercel Deployment & CRLF
**Dikkat:** Windows üzerinde çalışırken Git'in CRLF -> LF dönüşümü yapması `multi_replace` araçlarını yanıltabilir. Dosya düzenlemelerinde bu farkı göz önünde bulundurmak kritiktir.

## 💡 İpuçları
- Supabase sorgularında `onLocationChange` gibi sık tetiklenen olayları `debounce` etmek performansı artırır.
- Bölünmüş ekran modunda z-index yönetimi (DrawingCanvas ve Footer) 90+ seviyesinde tutulmalıdır.

## 📝 Geçmiş Kritik Sorunlar & Çözümler

### 1. PDF Kapak Görseli Çıkarma (Extraction)
**Sorun:** PDF dosyalarından kapak görseli çıkarırken `pdfjs` worker konfigürasyonunun ve yerel dosya yolunun hatalı olması.
**Çözüm:** `pdfjs` worker'ı için doğru statik yol tanımlandı ve çıkarılan görsellerin tarayıcı belleği yerine Supabase Storage (`covers` bucket) üzerinde depolanması sağlandı. Bu, görsellerin kalıcı olmasını sağladı.

### 2. CORS Hataları ve Supabase Storage
**Sorun:** Farklı kaynaklardan gelen veya yerel blob olarak tutulan kapak görsellerinin CORS (Cross-Origin Resource Sharing) politikasına takılması.
**Çözüm:** Tüm kapak görselleri merkezi olarak Supabase Storage üzerinden servis edilecek şekilde mimari güncellendi. Resim URL'leri veritabanında bu yeni yollara göre normalize edildi.

### 3. Flipbook ve Okuma Modları
**Sorun:** Flipbook modunda sayfaların birbirine çok yakın olması veya navigasyon butonlarının sayfa üzerinde kalması.
**Çözüm:** `react-pageflip` kütüphanesi için özel margin ve scaling ayarları yapıldı. Reader UI'ın (Header/Footer) `AnimatePresence` ile yumuşak geçişler yapması sağlandı.

### 4. Zoom ve Sayfa Navigasyonu (Legacy Fixes)
**Sorun:** Klasik okuma modunda zoom yapıldığında sayfa numarasının kaybolması veya "Next/Prev" butonlarının işlevini yitirmesi.
**Çözüm:** Zoom seviyesi `transform: scale()` yerine bir üst katmandaki `scale` state'i ile yönetildi. Navigasyon butonları merkezi `nextPage` ve `prevPage` fonksiyonlarına bağlandı.

### 5. Görsel Üretimi (Quote Cards)
**Teknik:** `html-to-image` kütüphanesi kullanıldı.
**Öğrenilen:**
- Görsel kalitesini artırmak için `pixelRatio: 2` kullanılmalıdır.
- Modal açıldığında ilk renderda fontların veya kapağın tam yüklenmemesini önlemek için 100ms'lik bir `setTimeout` gecikmesi güvenli bir çözümdür.
### 6. EPUB Re-init Loop ve Navigasyon Sabitliği
**Sorun:** `DoubleStatic` gibi modlarda `epubOptions` nesnesinin her render'da yeni bir referans alması, `EpubReader`'ın sürekli `destroy/init` döngüsüne girmesine neden oluyordu. Bu da sayfa ilerleyince okuyucunun başa dönmesine veya takılmasına sebep oluyordu.
**Çözüm:** 
- Okuyucu konfigürasyonu (`flow`, `manager`, `spread`) `useMemo` içine alınarak referans sabitlendi.
- Parent'tan gelen `ref`, doğrudan çocuk bileşene (`EpubReader`) verilmek yerine local bir `innerRef` üzerinden `useImperativeHandle` ile tünellendi. Bu sayede render tetikleyicileri ile navigasyon komutları birbirinden izole edildi.

### 7. Unified Sync — Merkezi Veri Senkronizasyonu
**Sorun:** Favoriler, koleksiyonlar, notlar, istatistikler ve ayarlar sadece `localStorage`'da tutuluyordu. Kullanıcı cihaz değiştirdiğinde veya tarayıcı önbelleğini temizlediğinde tüm verilerini kaybediyordu.
**Çözüm:**
- `useStore.ts` içinde tüm kritik veri metodları (`toggleFavorite`, `updateBookTags`, `addAnnotation`, `removeAnnotation`, `addBookmark`, `removeBookmark`, `addCollection`, `removeCollection`, `updateCollection`, `setSettings`, `updateStats`) override edilerek Supabase senkronizasyonu eklendi.
- `fetchBooks` içinde `bookmarks` ve `annotations` tabloları da çekilerek uygulama açılışında tam hydration sağlandı.
- Auth Observer: `useAuthStore.subscribe` ile kullanıcı değiştiğinde `fetchBooks()` otomatik tetikleniyor.

### 8. Split Mode — Geçici Oturum Durumu (Session State)
**Sorun:** Bölünmüş ekran (split) modunun kalıcı olarak `localStorage` ve Supabase'e kaydedilmesi, her yeni kitap açılışında hatanın tekrarlamasına neden oluyordu. Migration çalışsa bile Supabase profil sync `split`'i geri yüklüyordu (3 katmanlı override zinciri).
**Çözüm:**
- `split` modu artık bir "geçici oturum durumu" (temporary session state) olarak ele alınıyor.
- `setSettings` override'ında: `readingMode === 'split'` ise, `localStorage`'a ve Supabase'e `double-static` olarak kaydediliyor. Bellekteki (in-memory) state ise aktif oturumda `split` kalıyor.
- `fetchBooks` profil sync'inde: Supabase'den `readingMode: 'split'` gelirse otomatik olarak `double-static` ile değiştiriliyor.
- **Kural:** Kalıcılık katmanlarına (localStorage, Supabase) asla `split` yazılmamalıdır.

### 9. Güvenlik & Hata Yönetimi — Optimistic Rollback Pattern
**Sorun:** Supabase mutasyonlarında (insert/update/delete) try-catch yoktu. Ağ kesildiğinde yerel state güncelleniyor ama veritabanına yazılamıyordu — kullanıcı sayfayı yenilediğinde veri kayboluyordu.
**Çözüm — Optimistic Rollback:**
1. Yerel state **önce** güncellenir (hızlı UI tepkisi).
2. Supabase sorgusunun sonucu beklenir.
3. Hata durumunda: yerel state **otomatik olarak geri alınır** (rollback) ve Türkçe `toast.error` gösterilir.
- **Dikkat:** `updateProgress` ve `touchLastRead` gibi sık çağrılan metodlarda rollback yapılmaz (spam riski). Sadece `console.error` ile loglanır.
- `toggleFavorite`, `addBookmark`, `addAnnotation`, `addCollection`, `removeCollection`, `updateCollection`, `assignToCollection` ve `updateBookTags` metodlarında tam rollback uygulandı.

### 10. Admin Güvenliği — Merkezi Yetkilendirme
**Sorun:** Admin paneli sadece frontend'te korunuyordu (`Layout.tsx`'te hardcoded e-posta kontrolü). Herhangi bir kullanıcı `/admin` URL'sine giderek erişebiliyordu.
**Çözüm:**
- `admin.ts` modülü oluşturularak admin e-postaları ve `isAdmin()` fonksiyonu merkezileştirildi.
- `AdminGuard.tsx` route guard bileşeni eklendi — yetkisiz kullanıcılar ana sayfaya yönlendirilir.
- `Layout.tsx` hardcoded e-postalar kaldırılıp merkezi `isAdmin()` kullanıldı.
- **Kural:** Admin kontrolü her zaman hem frontend (UI gizleme) hem de route seviyesinde (guard) yapılmalıdır. Üretim ortamında Supabase RLS kuralları da eklenmelidir.

### 11. QuoteModal — Kompakt Tasarım Prensibi
**Sorun:** Alıntı paylaşım modalı (`QuoteModal`) çok büyüktü. Tam ekran dışında reader header/footer çıkınca modal kontrolleriyle çakışıyordu.
**Çözüm:**
- Modal genişliği `max-w-4xl` → `max-w-2xl`, yüksekliği `max-h-[85vh]` ile sınırlandı.
- Kart önizleme `scale-[0.45]` ~ `scale-[0.65]` aralığına küçültüldü, negatif margin ile boş alan azaltıldı.
- Kontrol barı tek satır `flex-wrap` düzeniyle kompaktlaştırıldı.
- **Kural:** Reader üzerindeki modal/overlay bileşenleri her zaman reader header/footer z-index'inden düşük tutulmalı veya viewport'un %85'ini geçmemeli.

### 12. PDF Metin Seçimi — mix-blend-mode Tuzağı
**Sorun:** `PdfReader`'da `.react-pdf__Page__textContent` katmanına uygulanan `mix-blend-mode: multiply` seçilen metni çoklu gölge/karanlık katman olarak gösteriyordu.
**Çözüm:**
- `mix-blend-mode: multiply` (ve dark mode için `screen`) tamamen kaldırıldı.
- Bunun yerine `color: transparent !important` ile metin katmanı görünmez yapıldı.
- `::selection` pseudo-element'e turuncu arka plan (`rgba(249, 115, 22, 0.3)`) uygulandı.
- **Kural:** PDF text katmanında asla `mix-blend-mode` kullanılmamalı — `color: transparent` + `::selection` yeterlidir.

### 13. Supabase Annotation Insert — data JSON Pattern
**Sorun:** `addAnnotation` fonksiyonu, client-side alanları (`cfiRange`, `type`, `note`, `text`, `color`, `createdAt`) doğrudan Supabase `annotations` tablosundaki sütun isimleri ile eşleştirmeye çalışıyordu. camelCase veya eksik sütunlar nedeniyle insert başarısız oluyordu.
**Çözüm:**
- Supabase'e sadece `id`, `book_id`, `user_id` ve tüm annotation objesini içeren `data` (jsonb) sütunu gönderiliyor.
- Bu pattern, tablo şemasını değiştirmeden client-side veri yapısının serbestçe genişletilmesine olanak tanır.
- **Kural:** Karmaşık/iç içe veri yapıları Supabase'e `jsonb` sütun olarak yazılmalı, her alan için ayrı sütun açılmamalı.
### 14. Mobil PDF Okuyucu — Zorunlu Tek Sayfa (Strict Single Mode)
**Sorun:** `ReaderContainer` seviyesinde `readingMode` override edilmesine rağmen, `PdfReader` gibi çocuk bileşenler doğrudan `settings`'ten okuma yaparak mobilde çift sayfa render etmeye devam edebiliyor.
**Çözüm:**
- `PdfReader.tsx` içinde yerel bir `isMobile` check (`window.innerWidth < 1024`) her zaman yapılmalıdır.
- `isDoubleMode` değişkeni `!isMobile && settings.readingMode.includes('double')` şeklinde tanımlanarak donanım seviyesinde kısıtlanmalıdır.
- **Kural:** Mobil kısıtlamaları sadece parent'ta değil, render kararı veren uç bileşenlerde de (leaf components) kontrol edilmelidir.

### 15. PDF Viewport Optimizasyonu — Mobil Padding Dengesi
**Sorun:** PDF sayfaları mobilde çok küçük görünüyor ve altında/yanında büyük boşluklar kalıyordu. Sebebi: Desktop için tasarlanmış high-padding (120px v-padding, 80px h-padding) değerlerinin mobilde de kullanılması.
**Çözüm:**
- `getPageWidthConstraint` fonksiyonunda mobil (`isMobile`) için padding değerleri minimize edildi: `vPadding: 20px`, `hPadding: 16px`.
- Bu sayede PDF sayfası mobil ekranı %100'e yakın kaplar ve dikey boşluk sorunu çözülür.

### 16. Veritabanı Migrasyonu — IndexedDB Version Pattern
**Sorun:** Yeni bir `objectStore` (örn: `drawings`) eklendiğinde, tarayıcısında veritabanı hali hazırda mevcut olan kullanıcılarda `onupgradeneeded` tetiklenmiyor ve uygulama "Object store not found" hatasıyla çöküyor.
**Çözüm:**
- `indexedDB.open(DB_NAME, version)` çağrısındaki `version` numarası her şema değişiminde artırılmalıdır (örn: v2 → v3).
- Bu artış, tarayıcıyı `onupgradeneeded` bloğunu çalıştırmaya zorlar ve eksik store'lar güvenle oluşturulur.
- **Kural:** Şemaya yeni bir store veya index eklendiğinde DB versiyonu mutlaka bir üst tam sayıya yükseltilmelidir.
### 17. Metin Seçimi Stabilizasyonu — Web "Refresh" Bug Çözümü
**Sorun:** Masaüstünde (web) metin seçmek için fareyi sürüklemek, `useSwipeable`'ın `trackMouse: true` ayarı nedeniyle "sayfa çevirme" olarak algılanıyor, bu da sayfanın aniden değişmesine (yenilenme hissi) neden oluyordu.
**Çözüm:**
- `useSwipeable` ayarlarında `trackMouse` masaüstü için kapatıldı.
- Navigasyon alanlarına (`DoubleStatic`, `DoubleAnimated`, `SplitScreenReader`) `window.getSelection().toString()` kontrolü eklendi. Metin seçiliyken navigasyon tetiklenmesi engellendi.
- **Kural:** Okuyucu üzerindeki şeffaf navigasyon katmanları her zaman metin seçim durumundan haberdar olmalı ve seçimi bozmamalıdır.

### 18. Callback Referential Loops — useCallback & useRef Kararlılığı
**Sorun:** `onTextSelected` gibi parent'tan gelen callback'lerin her render'da değişmesi, alt bileşenlerde (örn: `PdfReader`) `useEffect` ve event listener'ların sürekli silinip yeniden kurulmasına, dolayısıyla performans kaybına ve state kilitlenmelerine neden oluyordu.
**Çözüm:** 
- Parent (`ReaderPage`) seviyesindeki callback'ler `useCallback` ile sarmalandı.
- Alt bileşenlerde (`PdfReader`, `EpubReader`) bu callback'ler bir **Ref** (`useRef`) içinde tutularak event listener'lar içinde kullanıldı.
- Bu sayede listener asla silinmeden her zaman callback'in en güncel haline erişebilir hale geldi.
- **Kural:** Sık tetiklenen window/document event listener'ları içinde dışarıdan gelen callback'ler her zaman `useRef` üzerinden tüketilmelidir.
