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

### 19. Seri Okuma (Streak) & İstatistik Mantığı
**Sorun:** Kullanıcı okuma serisinin hesaplanmaması ve tarihlerin UTC farkı nedeniyle grafiklerde yanlış veya boş görünmesi.
**Çözüm:**
- `updateStats` fonksiyonu `en-CA` locale'i (YYYY-MM-DD) kullanacak şekilde standardize edildi. Bu, yerel zamana göre gün değişimlerini garanti altına alır.
- Seri okuma (streak) hesaplaması için `T00:00:00` zorlamasıyla takvim günü farkı (`diffDays === 1`) kontrolü eklendi.
- **Kural:** İstatistik verilerinde `toISOString().split('T')[0]` yerine her zaman `toLocaleDateString('en-CA')` tercih edilmelidir.

### 20. Admin Paneli Veri Siralaması
**Öğrenilen:** Admin panelindeki kullanıcı ve kitap listeleri varsayılan olarak rastgele geliyordu. 
**Çözüm:** Supabase sorgularına `.order('created_at', { ascending: false })` eklendi. Ayrıca UI tablolarına "Zaman" sütunu eklenerek görünürlük artırıldı.
- **Kural:** Yönetimsel listeler her zaman "en yeni önce" prensibiyle sunulmalıdır.

### 21. Recharts Tooltip Formatter — Type Stability
**Sorun:** Recharts `Tooltip` bileşeninde `formatter` fonksiyonuna gelen `value` parametresi bazen `undefined` olabiliyor ve bu durum TypeScript hatalarına veya görsel bozukluklara yol açıyor.
**Çözüm:** Formatter fonksiyonunda her zaman `(value: any) => value !== undefined ? ... : ...` kontrolü yapılmalı ve değer `any` olarak işaretlenerek Recharts'ın iç tip uyuşmazlıkları bypass edilmelidir.

### 22. Dependency-Free UI Components — ScrollArea Pattern
**Sorun:** `@radix-ui/react-scroll-area` gibi ağır bağımlılıkların her küçük bileşen için projeye dahil edilmesi bundle boyutunu artırır ve bazen versiyon çakışmalarına neden olur.
**Çözüm:** Modern CSS (scrollbar-thin, custom scrollbar styling) ve React forwardRef kullanılarak, ek paket gerektirmeyen ancak premium hissettiren özelleştirilmiş ScrollArea bileşenleri tercih edilmelidir.

### 23. Admin Panel Modernizasyonu — Modular Analysis
**Öğrenilen:** Karmaşık yönetim sayfalarını (Admin.tsx gibi) tek bir dosya yerine `ActivityStream`, `UserDetailDrawer` ve `StorageChart` gibi bağımlı olmayan alt bileşenlere bölmek, sürdürülebilirliği %300 artırır.
**Kural:** Büyük tablolar ve istatistik panelleri her zaman kendi state ve logic'ine sahip izole bileşenler olarak tasarlanmalıdır.

### 24. Storage Cleanup Logic
**Sorun:** Kitap silindiğinde bazen fiziksel dosyaların (Supabase Storage) kalması ve "orphan" (yetim) dosyaların birikmesi.
**Çözüm:** Storage'daki tüm dosyaları listeleyen ve veritabanındaki kitap yollarıyla karşılaştıran bir `handleScanStorage` motoru uygulandı. Eşleşmeyen dosyalar toplu silme (bulk delete) ile temizlenir.

### 25. Misafir Kitapları Otomatik Temizlik (Guest Life Cycle)
**Sorun:** Kayıtlı olmayan (misafir) kullanıcıların yüklediği kitapların, sistemde süresiz kalarak depolama alanını doldurması.
**Çözüm:** `Admin.tsx` içindeki `fetchAdminData` fonksiyonuna bir temizlik mantığı eklendi. `user_id` değeri olmayan (misafir) ve 7 gündür hiçbir aktivite (`lastActive` veya `created_at`) göstermeyen kitaplar, admin panele her girildiğinde otomatik olarak taranır ve hem veritabanından hem de storage'dan silinir.

### 26. Admin Paneli UI & Tipografi Standartları
**Öğrenilen:** Yönetim panelindeki sekmeler (Tabs), çok fazla öğe eklendiğinde yatay kaydırmaya (scroll) neden olarak "Sistem" gibi kritik ayarları gizleyebiliyordu.
**Çözüm:**
- `TabsList` bileşenine `flex-wrap` ve `gap-1` uyarısı eklenerek sekmelerin alt satıra geçebilmesi sağlandı.
- Sekme yazı boyutları `text-[9px]` yerine `text-[11px]` olarak güncellenerek okunabilirlik artırıldı.
- "Misafirler" sekmesi gibi özel sekmelerdeki ayırt edici renkler (primary/red), genel tasarım bütünlüğünü bozmamak için nötrlendi ve sadece `active` state'e bırakıldı.

### 27. Gerçek Zamanlı İstatistik Hassasiyeti (Live Readers)
**Mantık:** "Aktif Seanslar" terimi kullanıcılar için kafa karıştırıcı olabiliyordu. 
**Çözüm:** 
- Terim hem TR hem EN çevirilerinde **"Anlık Okuyanlar" / "Live Readers"** olarak güncellendi.
- "Anlık" tanımı, son **15 dakika** içinde en az bir sayfa çevirmiş olan kullanıcıları ifade edecek şekilde teknik olarak kısıtlanarak verinin doğruluğu sağlandı.

### 28. İstatistik Grafikleri Görünürlük Sorunu (Empty State & Min Height)
**Sorun:** `Stats.tsx` sayasındaki haftalık aktivite grafiğinde, kullanıcı az sayfa okuduğunda bar yüksekliklerinin 0'a yakın görünmesi ve grafiğin "boş" algılanması.
**Çözüm:**
- Barlar için `Math.max(percentage, 5)` kullanılarak minimum %5 yükseklik garantisi verildi.
- `bg-primary/10` ile boş günler için soluk bir zemin oluşturuldu.
- `Recharts` yerine kullanılan `motion.div` bazlı özel bar yapısı, hover durumunda detaylı `tooltip` ve gradyan efektleriyle modernize edildi.

### 29. X (Twitter) Doğrudan Görsel Paylaşımı (Web Share & Clipboard)
**Sorun:** X Web Intent (`intent/tweet`) sadece metin ve link kabul eder. Kullanıcılar link paylaşımı (OG Card) yerine "bilgisayardan görsel yüklüyormuş gibi" doğrudan görselin tweet'e eklenmesini istemektedir.
**Çözüm (Direct Share Approach):**
1. **Web Share API (Mobil Destekli):** `navigator.share` kullanılarak görsel bir `File` nesnesi olarak paylaşılır. Bu, mobil cihazlarda X uygulamasına **gerçek görseli** otomatik olarak ekler.
2. **Clipboard API (Masaüstü Fallback):** Masaüstü tarayıcılarda güvenlik nedeniyle X'e otomatik görsel "enjekte" edilemez. Çözüm olarak görsel `ClipboardItem` ile panoya kopyalanır ve kullanıcı X penceresine yönlendirilir. Kullanıcı sadece `Ctrl + V` yaparak görseli ekler.
3. **Download (Son Çare):** Clipboard desteklenmiyorsa görsel otomatik indirilir ve kullanıcıya X'e yüklemesi bildirilir.
- **Ders:** Sosyal medya platformlarının URL kısıtlamalarını aşmak için Web Share API ve Clipboard eş zamanlı kullanılmalıdır.
- [x] GSC: Sahiplik doğrulandı, indeksleme talebi iletildi.

### 32. Extreme SEO — UGC & Rich Schema Entegrasyonu
**Öğrenilen:** Sadece meta tag eklemek yetmez. Google'da dominasyon kurmak için:
- **UGC Indexing:** `api/share.js` sayfasını sadece yönlendirme için değil, botlar için `Quotation` ve `CreativeWork` şemalarıyla zenginleştirilmiş bir içerik sayfası olarak tasarladık.
- **Rich Sitemap:** `sitemap.xml` içine `google-image` namespace'i eklenerek görsel (marketing assets) indeksleme aktif edildi.
- **FAQ Schema:** Anasayfaya teknik FAQ (SSS) şeması eklenerek Google Asistan ve "Öne Çıkarılan Snippet"lerde görünme şansı artırıldı.

### 33. Metin Seçimi — Tireli Kelime Birleştirme (Normalizasyon)
**Sorun:** PDF ve EPUB formatlarında satır sonuna gelen ve tire ile bölünen kelimeler (`yardımla- şarak`) kopyalanırken aradaki boşluk ve tire korunuyordu, bu da alıntı kartlarının kalitesini düşürüyordu.
**Çözüm:** `lib/utils.ts` içinde `normalizeText` fonksiyonu geliştirildi. Regex ile `(\w)-\s+(\w)` paternleri yakalanarak tireli satır sonları temizlendi ve kelimeler bütünleştirildi. Bu işlem hem `PdfReader` hem `EpubReader` seçim olaylarına entegre edildi.
### 30. Düzenlenebilir Metadata (Editable Share Metadata)
**Sorun:** Kitapların meta verileri (yazar/başlık) bazen eksik veya hatalı olabiliyor (örn: "Unknown Author"), bu da paylaşılan alıntı kartlarının kalitesini düşürüyordu.
**Çözüm:** `QuoteModal` içine anlık düzenlenebilir `Title` ve `Author` giriş alanları eklendi.
- `useState` ile yönetilen `displayTitle` ve `displayAuthor` değerleri, `QuoteCard` bileşenine prop olarak geçilir.
- Kullanıcı giriş yaptıkça kart üzerindeki metin anlık (real-time) güncellenir.
- Bu sayede veritabanını değiştirmeden sadece paylaşılacak görsel için özel düzeltme yapılabilir.

### 31. Share Modal Viewport & "Premium" Ölçeklendirme
**Sorun:** Alıntı kartının modal içindeki ölçeği (scale) çok küçüktü ve etrafında büyük "gri alanlar" kalıyordu. Bu durum premium hissini bozuyordu.
**Çözüm:**
- Modal genişliği kart genişliğiyle sabitlendi (`max-w-[680px]`).
- Preview ölçeği `scale-[0.85]` seviyesine çıkarılarak kartın modalı neredeyse tamamen doldurması sağlandı.
- Gereksiz dış boşluklar (margins) temizlendi ve başlık alanı minimalize edildi.
- **Kural:** Paylaşım modalları her zaman görselin kendisini "başrol" yapmalı ve ekranın %90'ını dolduracak şekilde dinamik olarak ölçeklenmelidir.

### 34. PDF Kapak Üretimi - Placeholder Tuzağı ve Gerçek Sayfa Seçimi
**Sorun:** Kapak görünmeme sanılan hata, aslında PDF branch'inde bilinçli placeholder üretilmesiydi. Bazı dosyalarda ilk sayfa da gerçek kapak olmadığı için tek sayfa render yaklaşımı yanlış sonuç veriyordu.
**Çözüm:**
- `extractCoverLocally` içinde PDF akışı gerçek render ile değiştirildi.
- İlk 3 sayfa sırayla render edilip görsel skorlamayla en güçlü aday seçildi.
- Sonuç görseli önce `covers` bucket'a kalıcı yazılıyor, başarısız olursa data URL fallback korunuyor.
- `useStore` tarafında backfill versiyonu yükseltilerek mevcut PDF kayıtlarının da yeniden işlenmesi sağlandı.
- **Kural:** PDF kapak tespiti "sadece page 1" varsayımıyla değil, çoklu sayfa ve kalite skoru yaklaşımıyla yapılmalıdır.

### 35. Admin User Detail Drawer - Demo Algısı vs Gerçek Veri
**Sorun:** Kullanıcı detay panelindeki bazı metrikler "0" görünürken bunun demo veri mi yoksa gerçek veri mi olduğu belirsizdi. Eski kayıtların bir kısmında `user_id` eksik olduğu için kitap sayısı da düşük görünüyordu.
**Çözüm:**
- Drawer artık sadece canlı veri hesapları gösteriyor; veri yoksa metrik kartlarında ve grafik alanlarında açık "veri yok" durumu gösteriliyor.
- Kullanıcı kitapları filtrelenirken legacy storage path içinden kullanıcı kimliği çıkarımı için fallback eklendi.
- Toplam kitap sayısı doğrudan `userBooks.length` ile hesaplanarak tutarlılık sağlandı.
- **Kural:** Admin panelinde "0" ile "veri yok" aynı durum değildir; UI bu iki durumu ayrı göstermelidir.

### 36. PDF Cover Regression (2026-03)
**Sorun:** Main'e toplu commit tasinirken backfill tekrar agresif calisti ve extraction hatalarinda placeholder kapaklar DB'ye geri yazilabildi.
**Cozum:**
- Backfill extraction cagrisinda `allowPlaceholderFallback: false` kullanildi; extraction basarisizsa update skip edilir.
- Backfill version `v4` yapilarak mevcut PDF kayitlari guvenli sekilde yeniden islendi.
- Blob alma zinciri guclendirildi: `fetch(file_url)` -> `storage.download` -> `createSignedUrl`.
**Kural:** Backfill asla placeholder gorseli veritabanina yazmamalidir.
