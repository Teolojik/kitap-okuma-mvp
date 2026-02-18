# SEO Operations Checklist

Bu dosya Search Console ve teknik SEO operasyonlarini haftalik olarak takip etmek icin kullanilir.

## Weekly Checklist

- [ ] `sitemap.xml` fetch kontrolu (HTTP 200 + guncel `lastmod`)
- [ ] `robots.txt` fetch kontrolu (Sitemap satiri + noindex route kurallari)
- [ ] GSC `Pages` raporunda yeni `Excluded` trend kontrolu
- [ ] GSC `Sitemaps` raporunda parse hatasi kontrolu
- [ ] `Discover` ve home URL icin URL Inspection testi
- [ ] Canonical tutarliligi (`www` host) spot-check
- [ ] `Core Web Vitals` durum degisimi kontrolu

## Weekly Runbook

1. Production deploy sonrasi `https://www.epigraphreader.com/sitemap.xml` ac.
2. GSC `Sitemaps` ekraninda son submit edilen dosyanin durumunu kontrol et.
3. GSC `Pages` ekraninda son 7 gunde artan hata tiplerini not et.
4. `Excluded by noindex` listesinde beklenmeyen public URL var mi kontrol et.
5. `Indexed` URL listesinde `login/admin/read/book-private` benzeri route var mi kontrol et.
6. Sorun varsa issue template ile gorev ac.

## Public Book Sitemap Feed

- Build script `apps/web/scripts/generate-seo-files.mjs` kitap URL'lerini iki kaynaktan okuyabilir:
  - `apps/web/public/public-books.json` (lokal feed)
  - Supabase `public_books` tablosu (opsiyonel, env ile)
- Kitap URL eklemeyi acmak icin deploy ortaminda:
  - `ENABLE_PUBLIC_BOOK_SITEMAP=true`
  - `SEO_SUPABASE_URL=<project-url>` (opsiyonel)
  - `SEO_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>` (opsiyonel)
- Env tanimli degilse script guvenli fallback ile sadece temel sayfalari sitemap'e yazar.
- `public-books.json` ile Supabase katalogunu esitlemek icin:
  - `npm run seo:sync-public-books`
  - Liste disindaki yayinlari da pasiflestirmek icin: `npm run seo:sync-public-books:prune`

## Issue Template

Kopyala ve yeni task ac:

```md
Title: [SEO] <kisa baslik>

Date:
Environment: production / preview

Symptoms:
- 

Expected:
- 

Evidence:
- URL:
- GSC Screenshot/Report:
- HTTP Headers:

Likely Cause:
- 

Action Plan:
1. 
2. 

Owner:
Due Date:
```

## Notes

- `/book/:id` route'lari su an public veri modeli olmadigi icin `noindex` korunur.
- Bu koruma kaldirilmadan once `Public Book Detail Modeli` tamamlanmis olmali.
