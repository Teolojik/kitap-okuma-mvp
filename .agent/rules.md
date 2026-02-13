# Epigraph Rules (Anayasa)

Bu belge, Epigraph projesindeki tüm yapay zeka destekli değişiklikler için kuralları ve standartları tanımlar.

## 🛑 Onay Mekanizması (KRİTİK)
1. **Onaysız İşlem Yok:** Dosya silme, büyük refactoring veya proje mimarisini etkileyen kritik değişiklikler yapılmadan önce MUTLAKA kullanıcıdan onay alınmalıdır.
2. **Doğru Proje Bağlamı:** Başka bir projeye ait bilgilerin (domain, isim vb.) mevcut projeyle karıştırılmaması için azami dikkat gösterilmelidir.
3. **Dökümantasyon Zorunluluğu:** Tamamlanan her görev sonunda `TODO.md` (ilerleme), `ARCHITECTURE.md` (yapı değişikliği varsa) ve `KNOWLEDGE.md` (yeni bilgi/çözüm varsa) güncellenmelidir.

## 🚀 Temiz Teslimat Kuralları
1. **Bozuk Build Yok:** Her görev, projenin hala derlendiği ve tip kontrollerinden geçtiği doğrulanarak TAMAMLANMALIDIR.
2. **Önce Lint:** Bir görevi tamamlanmış saymadan önce her zaman linting (kod stili kontrolü) çalıştırın.
3. **Yer Tutucu Yok:** Üretim kodunda asla `// TODO` veya geçici yer tutucular bırakmayın. Bir özellik eksikse, açık bir `GELİŞTİRİLECEK: [Özellik Adı]` notuyla işaretleyin.
4. **Dayanıklılık:** Tüm Supabase etkileşimleri, misafir veya çevrimdışı mod için bir hata payı/yedek mekanizmasına (fallback) sahip OLMALIDIR.

## 📝 Coding Standards
- **Naming:** Açık ve tanımlayıcı isimler kullanın. `user` yerine `u` gibi kısaltmalardan kaçının.
- **Typing:** Sadece katı TypeScript. Ne pahasına olursa olursa olsun `any` kullanmaktan kaçının.
- **State:** Keep Zustand stores modular. Small slices are better than large monolithic objects.
- **UI:** Prioritize accessibility (Radix UI) and smooth animations (Framer Motion).

## ✅ Verification Workflow
Bir görevi "Bitti" olarak işaretlemeden önce şunları çalıştırın:
```bash
# apps/web dizininde
# /verify komutunu kullanabilirsiniz
npm run lint
npx tsc --noEmit
npm run build
```

*Zor yoldan öğrendik, artık doğru yoldan ilerliyoruz.*
