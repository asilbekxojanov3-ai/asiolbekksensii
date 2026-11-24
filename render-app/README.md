# Asilbek Sensei

O‘zbek tilida yapon tilini o‘rgatadigan, N5–N1 bosqichli o‘quv platformasi. Sahifa HTML bilan tuzilgan, dizayn CSS’da, interaktivlik JavaScript’da. Node.js serveri akkauntlar, darslar va o‘quvchi natijalarini SQLite bazasida saqlaydi.

## Kompyuterda ishga tushirish

Node.js 22.13 yoki undan yangiroq versiyasi kerak. PowerShell’da `outputs` papkasiga o‘ting:

```powershell
cd outputs
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "O‘zingiz tanlagan uzun parol"
npm start
```

Brauzerda `http://localhost:3000` manzilini oching. Birinchi ishga tushishda 25 ta boshlang‘ich dars va administrator hisobi yaratiladi. Admin paroli kamida 12 belgidan iborat bo‘lsin. Foydalanuvchi nomi 3–24 ta harf, raqam, `_` yoki `-` bo‘lishi mumkin; foydalanuvchi paroli kamida 10 belgidan iborat.

## Ishlatish

- Ro‘yxatdan o‘tgan o‘quvchi darsni tugatib, natijasini akkauntiga yozadi. Har bir yakunlangan dars 10 XP beradi.
- Darslar daraja va yo‘nalish bo‘yicha saralanadi. Tinglash namunalari brauzerning yaponcha matnni ovoz chiqarish imkoniyatidan foydalanadi.
- `ADMIN_EMAIL` va `ADMIN_PASSWORD` orqali administrator hisobi yaratiladi. Shu email bilan kirganda admin bo‘limi ko‘rinadi; dars qo‘shish, tahrirlash va o‘chirish, shuningdek foydalanuvchi va dars statistikasini ko‘rish mumkin.
- Foydalanuvchi parollari scrypt yordamida xeshlanadi. Sessiya cookie `HttpOnly` va `SameSite=Strict` xususiyatlariga ega; HTTPS hostingda `NODE_ENV=production` qiymatini o‘rnating.
- SQLite bazasi `asilbek-sensei.sqlite` nomi bilan yaratiladi. Doimiy fayl saqlash imkoniyati bor hostingdan foydalaning. Ma’lumotlar bazasini ommaga ochiq papkaga ko‘chirmang.

## Fayllar

- `index.html` — sahifa tuzilmasi va dars mazmuni
- `style.css` — ranglar, joylashuv, kartalar va moslashuvchan dizayn
- `app.js` — dars filtrlari, hisoblar, admin amallari va rivojlanish
- `server.js` — SQLite, parol xeshlash, sessiya va himoyalangan API

## Internetga joylashtirish

`render.yaml` Render Blueprint sozlamasini beradi. Uni GitHub repozitoriyasiga joylab, Render’da **New → Blueprint** orqali repozitoriyani ulang va `ADMIN_EMAIL` hamda kamida 12 belgili `ADMIN_PASSWORD` qiymatlarini kiriting.

**Muhim:** Render bepul web xizmatining fayl tizimi vaqtinchalik. Servis 15 daqiqa bo‘sh turganda uxlaydi; har bir uxlab uyg‘onish, qayta ishga tushish yoki yangi deploy SQLite faylini yo‘qotishi mumkin. Natijada bepul demo’da foydalanuvchi akkauntlari va rivojlanish saqlanib qolmaydi. Bepul Render Postgres ham doimiy variant emas: yangi bepul bazalar 30 kundan keyin tugaydi. Akkauntlar doimiy saqlanishi kerak bo‘lsa, ma’lumotlar bazasi uchun doimiy xizmat yoki pulli disk kerak bo‘ladi.

GitHub ulanishi va Render hisobiga kirish tasdiqlangach, repo’ni tayyorlab, Blueprint orqali deploy qilish mumkin. Hozircha loyiha internetga joylashtirilmagan.

