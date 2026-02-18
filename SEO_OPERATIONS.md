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

