---
description: Proje sağlığını doğrula (Lint, Tipler, Build)
---

# Proje Doğrulama İş Akışı

`kurallar.md` dosyasına uygun temiz bir teslimat sağlamak için bu adımları izleyin.

1. **Kod Stili Kontrolü (Lint)**
// turbo
```bash
cd apps/web && npm run lint
```

2. **Tip Güvenliği Kontrolü**
// turbo
```bash
cd apps/web && npx tsc --noEmit
```

3. **Üretim Derlemesi Kontrolü**
// turbo
```bash
cd apps/web && npm run build
```

---
*Proje bütünlüğünü korumak için her önemli değişiklikten sonra bu iş akışını çalıştırın.*
