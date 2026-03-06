# RUNBOOK: PDF Cover Issues

Bu runbook, PDF kapaklarin mor placeholder olarak gorunmesi veya kapaklarin hic gelmemesi durumunda operasyonel cozum adimlarini anlatir.

## 1) Belirti Tanimi

- Kutuphane ekraninda birden fazla kitap mor/gradient placeholder kapak gorunuyor.
- Kitap aciliyor ama kapak gorseli gercek cover yerine placeholder.
- Sorun genelde deploy/migration sonrasi veya cihaz degisikligi sonrasi fark edilir.

## 2) En Olasi Kok Nedenler

- Backfill islemi extraction hata aldiginda placeholder'i DB'ye yazmis olabilir.
- `file_url` uzerinden blob fetch bazi kayitlarda basarisiz kalmis olabilir.
- Storage path parse hatasi nedeniyle `covers` upload/update asamasi atlanmis olabilir.
- Eski backfill versiyonu (v4 oncesi) ile kalan kayitlar tekrar islenmemis olabilir.

## 3) Kod Seviyesi Koruma Kurallari

- Backfill extraction cagrilarinda:
  - `allowPlaceholderFallback: false` zorunlu.
  - Extraction basarisizsa DB update **yapilmaz** (skip).
- Blob alma zinciri sira ile:
  1. `fetch(file_url)` (cache: no-store)
  2. `supabase.storage.download(storagePath)`
  3. `createSignedUrl` fallback
- Backfill version bump yapilmadan toplu yeniden isleme tetiklenmez.

## 4) Hemen Kontrol (5 Dakika)

1. Uretimde hangi commit calisiyor kontrol et (`main` son commit).
2. `apps/web/src/stores/useStore.ts` icinde backfill versiyonunu kontrol et (beklenen: `v4` veya daha yeni).
3. Ayni dosyada backfill extraction cagrisinda `allowPlaceholderFallback: false` oldugunu dogrula.
4. `apps/web/src/lib/mock-api.ts` icinde extraction helper'in placeholder fallback'i opsiyonel mi kontrol et.
5. Sorunlu bir kitapta network panelinden `file_url` istegi ve storage fallback akisini dogrula.

## 5) Incident Fix Akisi

1. Kodda kural ihlali varsa once kodu duzelt.
2. Backfill versiyonunu bir ust degere cikart (ornek: `v4 -> v5`).
3. Production deploy al.
4. Kullanicidan hard refresh iste (Ctrl+F5), 30-90 sn bekle.
5. Sorunlu kayitlarda `cover_url` gercek gorsele dondu mu kontrol et.

## 6) Supabase SQL Notu

`supabase/create-drawings-table.sql` kapak sorununu cozmez; cizim (drawings) tablosu icindir.
Kapak problemi esasen extraction + backfill + storage erisim hattinda cozulur.

## 7) Dogrulama Checklist

- Mor kapak oraninda dusus var.
- Yeni upload edilen PDF'lerde gercek kapak uretiliyor.
- Reader acilisinda "PDF yuklenemedi" artisi yok.
- Error loglarda extraction fail ama DB update success kombinasyonu yok.

## 8) Geri Donus (Rollback) Kriteri

Asagidaki durumda rollback dusun:

- PDF acilis hatalari kapak fix deploy'u sonrasinda anlamli artarsa
- `cover_url` null/placeholder'a toplu donus gorulurse
- Storage signed URL/fetch hatalari hizla yukselirse

Rollback sonrasi ayni runbook ile tekrar kontrollu hotfix uygulanir.
