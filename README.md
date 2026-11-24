# ASILBEK SENSEI (アシルベク先生)

Yapon tilini o'rganish platformasi: HTML + CSS + JavaScript (frontend), Node.js + Express + SQLite (backend).

## Ishga tushirish
1. Node.js 20+ o'rnating: https://nodejs.org
2. Terminalda shu papkada:
   npm install
   npm start
3. Brauzerda oching: http://localhost:3000

Admin bo'lish uchun (ixtiyoriy): shu email bilan ro'yxatdan o'ting va serverni quyidagicha ishga tushiring:
   ADMIN_EMAIL=sizning@emailingiz.com npm start
   (Windows PowerShell: $env:ADMIN_EMAIL="sizning@emailingiz.com"; npm start)

## Tuzilma
- server.js      - backend (akkauntlar, parol hash, test tekshirish, XP, reyting)
- quiz-data.js   - test savollari (serverda, javoblar yashirin)
- public/        - frontend: HTML sahifalar, style.css, app.js
- data/          - SQLite baza (avtomatik yaratiladi, GitHub'ga yuklamang!)

## Xavfsizlik
- Parollar bcrypt bilan hash qilinadi (oddiy matn sifatida saqlanmaydi)
- Kirish httpOnly cookie + JWT orqali, maxfiy sahifalar API'lari himoyalangan
- Kiritilgan ma'lumotlar serverda tekshiriladi, login urinishlari cheklanadi
- Internetga chiqarishda HTTPS va NODE_ENV=production ishlating

## Keyingi qadamlar
Dars/lug'at/grammatika CRUD (admin), audio fayllar, N4-N1 kontenti, React'ga o'tish.
