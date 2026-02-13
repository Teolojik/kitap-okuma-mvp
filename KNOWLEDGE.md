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
