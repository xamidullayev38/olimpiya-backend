# Olimpiya Backend Admin (NestJS) — QR Badge Tizimi

Musobaqa/tadbir ishtirokchilarini akkreditatsiya qilish, QR-badge orqali zona
kirish nazorati va ovqatlanish monitoringi tizimining backend qismi.
TZ (`QR_Badge_Tizimi_TZ.md`) asosida to'liq ishlab chiqilgan.

## Texnologik stack

| Qatlam | Texnologiya |
|---|---|
| Backend framework | NestJS 10 (Node.js 20+, TypeScript) |
| ORM / DB | Prisma + PostgreSQL 16 |
| Auth | JWT (access + refresh, rotation), Argon2id parol xeshlash |
| Skaner qurilma auth | Alohida Device-token kanal (staff JWT'dan mustaqil) |
| Real-time | Socket.io (WebSocket) — dashboard |
| Fayl generatsiya | `qrcode`, `pdfkit` (badge PDF), `exceljs` (hisobot eksport) |
| Xavfsizlik | Helmet, CORS whitelist, class-validator, RBAC, rate-limit (Throttler), AES-256-GCM (PINFL) |

## Loyihani ishga tushirish

```bash
cp .env.example .env
# .env faylidagi barcha *_SECRET qiymatlarni albatta almashtiring:
#   openssl rand -base64 64

npm install
npx prisma generate
npx prisma migrate deploy      # yoki: npx prisma migrate dev (development uchun)
npm run prisma:seed            # default rollar, permissionlar, birinchi Super Admin

npm run start:dev              # development
# yoki
npm run build && npm run start:prod
```

Docker orqali:

```bash
cp .env.example .env
docker compose up -d --build
```

`npm run prisma:seed` ishga tushganda konsolga birinchi Super Admin uchun
**vaqtinchalik parol** chiqariladi — uni albatta xavfsiz joyga yozib qo'ying,
chunki u faqat bir marta ko'rsatiladi va birinchi kirishda almashtirilishi shart
(`mustChangePassword=true`).

## Arxitektura / modullar

```
src/
  common/           - global guard, filter, interceptor, decorator, util'lar
  config/           - .env validatsiya sxemasi (fail-fast agar maxfiy kalitlar yo'q/zaif bo'lsa)
  prisma/           - PrismaService (global)
  modules/
    auth/           - login, refresh token rotation, parol almashtirish
    users/          - tizim xodimlari (staff)
    roles/          - RBAC: rol va permissionlar (FT-26)
    accreditation-types/
    zones/
    meal-schedule/
    participants/   - CRUD + CSV ommaviy import (FT-1)
    badges/         - QR token servisi + PDF badge generatsiya (FT-2..FT-4)
    devices/        - skaner qurilmalarni ro'yxatga olish va autentifikatsiya
    scan/           - ASOSIY BIZNES MANTIQ: zona kirish va ovqatlanish nazorati (FT-6..FT-14)
    sync/           - offline paket va offline log yuklash (FT-16)
    access-logs/    - kirish tarixi + eksport
    meal-logs/      - ovqatlanish tarixi + eksport
    dashboard/      - real-time statistika (REST + WebSocket)
    audit-log/      - admin amallari audit jurnali (FT-28)
```

## Xavfsizlik choralari (batafsil)

1. **Autentifikatsiya kanallari ajratilgan.** Admin panel foydalanuvchilari
   (`JWT_ACCESS_SECRET`), badge QR tokenlari (`QR_TOKEN_SECRET`) va skaner
   qurilmalari (`DEVICE_TOKEN_SECRET`) — har biri **mustaqil** maxfiy kalit
   bilan imzolanadi. Bitta kanal sizib chiqsa, boshqalariga ta'sir qilmaydi.
   `src/config/validation.schema.ts` server ishga tushishida bu kalitlar
   bir-biridan farqli ekanligini majburiy tekshiradi (fail-fast).

2. **Parollar** faqat Argon2id bilan xeshlanadi (bcrypt emas — zamonaviy,
   GPU-hujumga chidamliroq). Login urinishlari cheklangan: `LOGIN_MAX_ATTEMPTS`
   dan ortiq noto'g'ri urinishdan keyin hisob `LOGIN_LOCKOUT_MINUTES`ga
   vaqtincha bloklanadi.

3. **Refresh token rotation + reuse detection.** Har bir refresh so'rovida
   eski token bekor qilinib, yangisi chiqariladi. Agar bekor qilingan token
   qayta ishlatilsa (o'g'irlangan token belgisi) — foydalanuvchining BARCHA
   sessiyalari avtomatik bekor qilinadi.

4. **QR kod ichida shaxsiy ma'lumot yo'q** (FT-3/NFT-4). Faqat imzolangan
   `{participantId, tokenId, version}` saqlanadi. Badge qayta chop etilsa
   (`reissue`), versiya oshiriladi va eski QR nusxalari avtomatik yaroqsiz
   bo'ladi — hatto ular hali ham fizik qog'ozda mavjud bo'lsa ham.

5. **PINFL shifrlash.** Shaxsiy identifikatsiya raqami bazada AES-256-GCM
   bilan shifrlangan holda saqlanadi (`PINFL_ENCRYPTION_SECRET`), ochiq
   holda faqat oxirgi 4 raqam ko'rsatiladi.

6. **RBAC (Role-Based Access Control).** Har bir endpoint
   `@RequirePermissions(...)` bilan belgilangan; `PermissionsGuard` global
   qo'llaniladi. Super Admin yangi rol yaratib, unga ixtiyoriy
   permissionlar biriktira oladi (FT-26).

7. **Global validatsiya.** `ValidationPipe({ whitelist: true,
   forbidNonWhitelisted: true })` — DTO'da ko'rsatilmagan har qanday field
   avtomatik rad etiladi (mass-assignment hujumlaridan himoya).

8. **Rate limiting.** Login (`5/min`), refresh, skan endpointlari
   (`5/soniya/qurilma`) va umumiy global limit — `@nestjs/throttler` orqali.

9. **Xatolarni maxfiylash.** `AllExceptionsFilter` orqali stack trace va
   ichki DB xatolari hech qachon clientga chiqarilmaydi, faqat serverda
   log qilinadi.

10. **Audit log** (FT-28) — barcha admin panel yozuv amallari (create/update/
    delete) `AuditLogInterceptor` orqali avtomatik yoziladi: kim, qachon,
    qaysi IP'dan, nima o'zgartirgani.

11. **CORS whitelist**, Helmet HTTP headerlari, production'da HSTS yoqilgan.

12. **Offline-first xavfsizlik** (FT-16). Mobil ilova offline holatda
    to'plagan loglarni serverga yuborganda, har bir yozuv qayta **serverda**
    to'liq tekshiriladi (badge holati, zona ruxsati, ovqat vaqti, "bugun
    allaqachon olganmi" — barchasi qaytadan). Mobil ilova faqat taxminiy
    (optimistik) UI ko'rsatishi mumkin, lekin yagona haqiqat manbai har
    doim server hisoblanadi. `clientEventId` orqali idempotentlik
    ta'minlanadi — internet uzilib-ulanib qolganda dublikat yozuvlar
    yaratilmaydi.

## Asosiy biznes qoidalari (ScanService)

`src/modules/scan/scan.service.ts` — tizimning yuragi:

- **Zona kirish** (`POST /scan/access`): badge holati → kategoriya-zona
  ruxsati → IN/OUT log. Har bir urinish (muvaffaqiyatli yoki rad etilgan)
  `AccessLog`ga yoziladi.
- **Ovqatlanish** (`POST /scan/meal`): badge holati → kategoriya ovqatlanishga
  ruxsatlimi → joriy vaqtga mos meal-schedule bormi → shu ovqat turiga
  kategoriya ruxsatlimi → **bugun shu ovqat turidan allaqachon olganmi**
  (asosiy qoida) → `MealLog`ga yozish.

## API versiyalash

Barcha endpointlar `/api/v1/...` prefiksi bilan (`VersioningType.URI`) —
kelajakda backward-compatible bo'lmagan o'zgarishlar uchun `v2` qo'shish oson.

## Muhim eslatma

- Bu backend **mustaqil loyiha** sifatida ishlab chiqilgan (TZ 1.2/1.3 ga
  muvofiq) — tashqi tizimlar bilan integratsiya, to'lov yoki bilet sotish
  funksiyalari yo'q.
- Fizik turniket/hardware integratsiyasi ko'rib chiqilmagan — faqat mobil
  skaner ilova backend API orqali ishlaydi.
- `npx prisma generate` internetga (query-engine binary yuklab olish uchun)
  ulanishni talab qiladi. Agar korporativ tarmoqda proxy/firewall bo'lsa,
  Prisma hujjatlaridagi `PRISMA_ENGINES_MIRROR` sozlamasidan foydalaning.
