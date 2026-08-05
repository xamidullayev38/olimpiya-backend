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
