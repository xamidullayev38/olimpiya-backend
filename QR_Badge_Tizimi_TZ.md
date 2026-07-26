# TEXNIK TOPSHIRIQ (TZ)
## Musobaqa/Tadbir ishtirokchilarini akkreditatsiya qilish, badge (QR) orqali zona kirish nazorati va ovqatlanish monitoringi tizimi

**Versiya:** 1.0
**Sana:** 22.07.2026
**Loyiha turi:** Alohida yangi loyiha (mustaqil backend + mobil skaner ilova + admin panel)

---

## 1. UMUMIY MA'LUMOT

### 1.1. Loyiha maqsadi
Yirik sport tadbirlari doirasida ishtirok etuvchi barcha shaxslar (sportchilar, murabbiylar, hakamlar, delegatsiya a'zolari, volontyorlar, jurnalistlar, mehmonlar va h.k.) uchun raqamli badge (QR kodli) yaratish, ularning binolar/zonalarga kirish huquqini nazorat qilish va ovqatlanish tartibini (kuniga belgilangan ovqat vaqtida bir marta) avtomatik cheklash tizimini yaratish.

### 1.2. Loyihaning qamrovi
- Mustaqil backend (API) va ma'lumotlar bazasi
- Admin/operator veb-paneli (ishtirokchilar, rollar, zonalar, hisobotlar)
- Mobil skaner ilovasi (Android/iOS) — QR kodni kamera orqali o'qish va kirish/kirmaslik qarorini chiqarish

### 1.3. Loyihada ishtirok etmaydigan narsalar (Out of scope)
- Fizik turniket/skaner hardware ishlab chiqarish (faqat mobil ilova ko'rib chiqiladi)
- To'lov tizimlari
- Onlayn bilet sotish

---

## 2. FOYDALANUVCHI ROLLARI (TIZIM DARAJASIDA)

| Rol | Tavsif | Asosiy huquqlar |
|---|---|---|
| **Super Admin** | Tizim egasi | Barcha modullarga to'liq kirish, rol va huquqlarni boshqarish |
| **Operator (Akkreditatsiya xodimi)** | Ishtirokchilarni ro'yxatga oladi, badge chiqaradi | Ishtirokchi CRUD, badge generatsiya/chop etish |
| **Zona menejeri** | Ma'lum zona/bino uchun mas'ul | O'z zonasi bo'yicha kirish tarixini ko'radi |
| **Skaner operatori (Qo'riqchi/Nazoratchi)** | Mobil ilovadan foydalanadi | Faqat QR skan qilish, natija ko'rish |
| **Oshxona xodimi** | Ovqatlanish nazorati punktida | Ovqatlanish uchun QR skan qilish |
| **Kuzatuvchi/Tahlilchi** | Faqat statistika ko'radi | Dashboard va hisobotlarni faqat o'qish (read-only) |

> **Eslatma:** Rollar tizimi moslashuvchan (RBAC) bo'lishi kerak — Super Admin yangi rol yaratib, unga alohida permissionlar (masalan: "ishtirokchi qo'shish", "badge chop etish", "hisobot eksport qilish" va h.k.) biriktira olishi kerak. Bu ishtirokchilarning o'z accreditation turidan (Sportchi, Volontyor, Hakam...) farqli — bu **tizim foydalanuvchilarining** (xodimlarning) roli.

---

## 3. ASOSIY OBYEKTLAR (ENTITY MODEL)

### 3.1. Ishtirokchi (Participant)
- F.I.Sh, rasm, PINFL, tug'ilgan sana, hujjat raqami, telefon
- Accreditation turi (Sportchi, Murabbiy, Hakam, Volontyor, Delegatsiya a'zosi, Jurnalist, VIP mehmon va h.k.)
- Sport turi (agar sportchi/murabbiy bo'lsa)
- Hudud/tashkilot
- Badge holati (faol/bloklangan/muddati tugagan)
- Unikal QR kod / badge ID

### 3.2. Accreditation turi (Kategoriya)
- Nomi, kodi, rangi, belgisi
- Ruxsat etilgan zonalar ro'yxati
- Ovqatlanishga ruxsat (bor/yo'q)

### 3.3. Zona / Bino
- Nomi, kodi (masalan: MPC, OC, VIP, Restoran va h.k.)
- Zona turi: kirish-chiqish nazorati kerakmi
- Zonaga biriktirilgan skaner nuqtalari (device/location)

### 3.4. Ovqatlanish jadvali (Meal Schedule)
- Musobaqa kuni
- Ovqat turi: Nonushta / Tushlik / Kechki ovqat
- Boshlanish va tugash vaqti (masalan, tushlik 12:00–15:00)
- Har bir ovqat turiga qaysi accreditation turlari ruxsat etilgani

### 3.5. Kirish tarixi (Access Log)
- Ishtirokchi ID
- Zona/nuqta
- Sana va vaqt
- Natija (ruxsat berildi / rad etildi + sabab)
- Skanerlagan xodim/qurilma

### 3.6. Ovqatlanish tarixi (Meal Log)
- Ishtirokchi ID
- Ovqat turi va sana
- Vaqt
- Natija (berildi / rad etildi — sababi: "bugun allaqachon olgan")

---

## 4. FUNKSIONAL TALABLAR

### 4.1. Ishtirokchilarni ro'yxatga olish va badge yaratish
> **Muhim:** Tizimda o'z-o'zini ro'yxatdan o'tkazish yoki bilet sotib olish funksiyasi yo'q. Badge faqat Operator/Admin tomonidan ma'lumotlari oldindan kiritilgan (yoki import qilingan) shaxs uchun generatsiya qilinadi.

- FT-1: Operator yangi ishtirokchini qo'lda kiritishi yoki Excel/CSV orqali ommaviy import qilishi mumkin bo'lishi kerak.
- FT-2: Har bir ishtirokchi ro'yxatga olinganda tizim avtomatik unikal QR kod (masalan, shifrlangan UUID yoki imzolangan token) generatsiya qilishi kerak.
- FT-3: QR kod ichida shaxsni to'g'ridan-to'g'ri aniqlaydigan ochiq ma'lumot bo'lmasligi kerak (faqat ID/token; ma'lumotlar serverdan so'raladi) — xavfsizlik uchun.
- FT-4: Badge shabloni tizimda bir marta shakllantiriladi (dizayn qilinadi) va shu shablon asosida barcha ishtirokchilar uchun badge (rasm, F.I.Sh, kategoriya rangi/belgisi, QR kod) avtomatik generatsiya qilinib, PDF holda yuklab olinadi (ommaviy chop etish uchun).
- FT-5: Ishtirokchilar ma'lumotlari faqat shu tizim ichida kiritiladi va boshqariladi (tashqi tizim bilan integratsiya qilinmaydi).

### 4.2. Zonalarga kirish nazorati (asosiy jarayon)
- FT-6: Skaner operatori mobil ilovada zonani tanlaydi (masalan, "VIP zona kirishi").
- FT-7: QR kod skanerlanganda tizim quyidagilarni tekshiradi:
  1. Badge faolmi (bloklangan/muddati o'tmaganmi)
  2. Ishtirokchining accreditation turi shu zonaga kirishga ruxsat etilganmi
- FT-8: Natija ekranda katta va aniq ko'rsatiladi: ✅ yashil (ruxsat) yoki ❌ qizil (rad, sababi bilan — masalan "Bu zonaga ruxsat yo'q").
- FT-9: Har bir skan natijasi (muvaffaqiyatli yoki rad etilgan) Access Log jadvaliga yoziladi.
- FT-10: Barcha zonalarda kirish/chiqish (IN/OUT) rejimi qo'llaniladi — har bir skan kirish yoki chiqish sifatida qayd etiladi va zonadagi joriy odamlar soni shu asosda hisoblanadi.

### 4.3. Ovqatlanish nazorati (biznes qoidasi — muhim)
- FT-11: Faqat ovqatlanishga ruxsati bor accreditation turlari (Sportchi, Murabbiy, Hakam, Volontyor va h.k.) oshxona nuqtasida QR skanerlay oladi.
- FT-12: Tizim joriy vaqtni tekshirib, qaysi ovqat turiga (Nonushta/Tushlik/Kechki) to'g'ri kelishini avtomatik aniqlaydi (Meal Schedule asosida).
- FT-13: **Asosiy qoida**: Bir ishtirokchi bir kunda bir xil ovqat turi (masalan, "Tushlik") uchun faqat **bir marta** kirishi mumkin. Ikkinchi urinishda tizim rad etadi: "Siz bugun tushlikni allaqachon olgansiz (14:32 da)".
- FT-14: Agar ishtirokchi ovqat vaqti oynasidan tashqarida (masalan, tushlik tugagandan keyin) skan qilsa — rad etiladi: "Tushlik vaqti tugagan".

### 4.4. Mobil skaner ilovasi
- FT-15: Ilova kamera orqali QR kodni tez (< 1 soniya) skanerlashi kerak.
- FT-16: Ilova **offline rejimda** ishlashi kerak — internet uzilgan taqdirda ham oxirgi sinxronlashtirilgan ma'lumotlar (ishtirokchilar ro'yxati, ruxsatlar, bugungi ovqatlanish tarixi) asosida ishlashi va keyinroq internet tiklanganda log'larni serverga yuborishi kerak.
- FT-17: Skaner qurilmalar soni cheklanmagan. Har bir qurilma ma'lum bir zona/binoga biriktiriladi — qaysi binoda ishlatilayotgani shu binoga mas'ul inson tomonidan ilovada tanlanadi.
- FT-18: Ilovada oxirgi 10 ta skan tarixi ko'rinib turishi kerak (operatorga nazorat uchun).
- FT-19: Ilova login/parol yoki PIN orqali autentifikatsiya qilinishi kerak.

### 4.5. Dashboard va hisobotlar (Admin panel)
- FT-21: Real-time statistika: hozirgi vaqtda har bir zonada nechta odam borligi (kirish-chiqish farqi).
- FT-22: Kunlik/soatlik ovqatlanish statistikasi (kim, qachon, qaysi ovqat, qaysi nuqtada).
- FT-23: Rad etilgan urinishlar hisoboti (kim, qachon, qayerda, nima sababdan rad etilgan) — bu shubhali holatlarni aniqlashga yordam beradi.
- FT-24: Excel/PDF formatida eksport qilish imkoniyati.
- FT-25: Ishtirokchi bo'yicha to'liq tarix (badge yaratilgandan buyon barcha kirish va ovqatlanish tarixi) ko'rinishi.

### 4.6. Rol va huquqlarni boshqarish (RBAC)
- FT-26: Super Admin yangi rol yarata olishi va har bir rolga alohida permissionlar (masalan: `participant.create`, `participant.edit`, `badge.print`, `report.export`, `zone.manage`) biriktira olishi kerak.
- FT-27: Har bir tizim foydalanuvchisi (xodim) bir yoki bir nechta rolga ega bo'lishi mumkin.
- FT-28: Barcha admin panel amallari audit log'ga yozilishi kerak (kim, qachon, nima o'zgartirdi).

---

## 5. NOFUNKSIONAL TALABLAR

| # | Talab |
|---|---|
| NFT-1 | Tizim bir vaqtning o'zida kamida 200+ ta faol skaner qurilmasidan kelayotgan so'rovlarni kechikishsiz (< 500ms) qayta ishlashi kerak |
| NFT-2 | Ma'lumotlar bazasi 50 000+ ishtirokchi va kuniga yuz minglab log yozuvlarini samarali saqlashi kerak |
| NFT-3 | Mobil ilova internet uzilishiga chidamli (offline-first arxitektura) bo'lishi kerak |
| NFT-4 | QR kodlar soxtalashtirishga qarshi himoyalangan bo'lishi kerak (raqamli imzo/token, statik shaxsiy ma'lumot emas) |
| NFT-5 | Barcha API so'rovlar HTTPS orqali va autentifikatsiya token (JWT) bilan himoyalangan bo'lishi kerak |
| NFT-6 | Tizim UZ/RU tillarini qo'llab-quvvatlashi kerak |

---

## 6. TEXNIK ARXITEKTURA (TAKLIF)

```
┌─────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│  Admin Panel     │      │   Backend API      │      │  Mobil Skaner      │
│  (Nuxt3/Vue)     │◄────►│  (REST/GraphQL)    │◄────►│  Ilova (RN/Flutter)│
└─────────────────┘      │                    │      └───────────────────┘
                          │  - Auth (JWT)       │             │
                          │  - Participants API │             │ Offline sync
                          │  - Access Control   │◄────────────┘
                          │  - Meal Control     │
                          │  - RBAC             │
                          └────────┬───────────┘
                                   │
                          ┌────────▼───────────┐
                          │   PostgreSQL DB     │
                          └────────────────────┘
```

> Tizim to'liq mustaqil, alohida yangi loyiha sifatida ishlab chiqiladi.

**Tavsiya etiladigan stack:**
- Backend: Node.js (NestJS) yoki Laravel — REST API
- Admin panel: Nuxt 3 + PrimeVue
- Mobil ilova: React Native (kross-platforma, kamera/QR kutubxonalari yetarli)
- DB: PostgreSQL + Redis (kesh, real-time hisoblash uchun)
- Real-time dashboard: WebSocket (Socket.io) orqali

---

## 7. ASOSIY API ENDPOINTLAR (QORALAMA)

```
POST   /api/participants                  - Yangi ishtirokchi qo'shish
POST   /api/participants/import            - Ommaviy import
GET    /api/participants/:id               - Ishtirokchi ma'lumoti
POST   /api/badges/:participantId/generate - QR/badge generatsiya

POST   /api/scan/access                    - Zona kirish skan qilish
POST   /api/scan/meal                      - Ovqatlanish skan qilish
GET    /api/access-logs                    - Kirish tarixi
GET    /api/meal-logs                      - Ovqatlanish tarixi

GET    /api/zones                          - Zonalar ro'yxati
POST   /api/zones                          - Yangi zona
GET    /api/meal-schedule                  - Ovqatlanish jadvali

GET    /api/dashboard/live-stats           - Real-time statistika

POST   /api/auth/login                     - Tizimga kirish
GET    /api/roles                          - Rollar ro'yxati
POST   /api/roles/:id/permissions          - Rolga huquq biriktirish

GET    /api/sync/offline-package           - Mobil ilova uchun offline paket yuklab olish
POST   /api/sync/upload-logs               - Offline yig'ilgan log'larni yuklash
```

---

## 8. ASOSIY BIZNES-QOIDALAR (XULOSA)

1. Har bir ishtirokchi bitta accreditation turiga ega, va shu tur qaysi zonalarga kirish mumkinligini belgilaydi.
2. Ovqatlanishga faqat belgilangan accreditation turlari (masalan Sportchi, Murabbiy, Hakam, Volontyor) ruxsatga ega — VIP mehmon yoki jurnalist kabi turlar ovqatlanish huquqisiz bo'lishi mumkin.
3. Bir kunda bir ovqat turi (Nonushta/Tushlik/Kechki) — faqat bitta muvaffaqiyatli kirish. Qayta urinish avtomatik rad etiladi.
4. Ovqat vaqti oynasidan tashqarida skan qilinsa — rad etiladi.
5. Har qanday rad etish sababi aniq ko'rsatiladi va log'ga yoziladi.
6. Barcha zonalarda kirish/chiqish (IN/OUT) qat'iy nazorat qilinadi — favqulodda qo'lda ruxsat berish (override) funksiyasi tizimda mavjud emas.

---

## 9. TEST VA QABUL QILISH MEZONLARI

- [ ] Ishtirokchi yaratilganda unikal QR kod avtomatik generatsiya qilinadi
- [ ] Ruxsat etilmagan zonaga kirishda aniq rad xabari chiqadi
- [ ] Bir kunda ikkinchi marta tushlikka kirishga urinishda tizim to'g'ri rad etadi
- [ ] Ovqat vaqti oynasidan tashqarida skan rad etiladi
- [ ] Mobil ilova internetsiz holatda ham to'g'ri ishlaydi va internet qaytganda sinxronlanadi
- [ ] Super Admin yangi rol yaratib, unga permissionlar biriktira oladi va bu amaliy tekshiriladi
- [ ] Dashboard real vaqtda zonalardagi odamlar sonini (kirish-chiqish farqi asosida) to'g'ri ko'rsatadi
- [ ] Badge shabloni bir marta yaratilib, barcha ishtirokchilar uchun ommaviy PDF generatsiya qilinadi
- [ ] Yangi skaner qurilma ulanganda, mas'ul inson uni istalgan binoga biriktira oladi
- [ ] 200+ parallel skan so'rovida tizim javob vaqti 500ms dan oshmaydi

---

*Ushbu TZ tayyor va ishlab chiqishga kiritish uchun asos bo'la oladi.*
