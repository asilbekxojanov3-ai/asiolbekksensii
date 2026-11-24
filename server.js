const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const quiz = require('./quiz-data');

const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// JWT kalitini bir marta yaratib faylga saqlaymiz (yoki JWT_SECRET muhit o'zgaruvchisidan olamiz)
const secretFile = path.join(__dirname, 'data', 'secret.txt');
if (!process.env.JWT_SECRET && !fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(48).toString('hex'));
const SECRET = process.env.JWT_SECRET || fs.readFileSync(secretFile, 'utf8');

const db = new Database(path.join(__dirname, 'data', 'sensei.db'));
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active TEXT,
  today_xp INTEGER NOT NULL DEFAULT 0,
  today_date TEXT,
  lessons_done INTEGER NOT NULL DEFAULT 0,
  jlpt_level TEXT NOT NULL DEFAULT 'N5',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const today = () => new Date().toISOString().slice(0, 10);
const publicUser = (u) => ({
  id: u.id, fullName: u.full_name, username: u.username, email: u.email, role: u.role,
  xp: u.xp, level: Math.floor(u.xp / 100) + 1, streak: u.streak,
  todayXp: u.today_date === today() ? u.today_xp : 0, dailyGoal: 50,
  lessonsDone: u.lessons_done, jlptLevel: u.jlpt_level, createdAt: u.created_at
});

function setSession(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5 });
}
function auth(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.token, SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) throw new Error();
    req.user = user; next();
  } catch { res.status(401).json({ error: 'Avval tizimga kiring' }); }
}
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Ruxsat yo\'q' });

// Login urinishlarini cheklash (brute-force himoyasi)
const attempts = new Map();
function limit(req, res, next) {
  const key = req.ip, now = Date.now();
  const a = (attempts.get(key) || []).filter(t => now - t < 15 * 60e3);
  if (a.length >= 10) return res.status(429).json({ error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urining' });
  a.push(now); attempts.set(key, a); next();
}

app.post('/api/register', limit, (req, res) => {
  const { fullName = '', username = '', email = '', password = '' } = req.body || {};
  const f = String(fullName).trim(), u = String(username).trim(), e = String(email).trim().toLowerCase();
  if (f.length < 2 || f.length > 60) return res.status(400).json({ error: 'Ism 2-60 belgidan iborat bo\'lsin' });
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) return res.status(400).json({ error: 'Username: 3-20 ta harf, raqam yoki _' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 100) return res.status(400).json({ error: 'Email noto\'g\'ri' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Parol kamida 8 ta belgi bo\'lsin' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ? OR username = ?').get(e, u)) return res.status(409).json({ error: 'Bu email yoki username band' });
  const hash = bcrypt.hashSync(password, 12);
  const role = ADMIN_EMAIL && e === ADMIN_EMAIL ? 'admin' : 'user';
  const info = db.prepare('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?,?,?,?,?)').run(f, u, e, hash, role);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  setSession(res, user); res.json({ user: publicUser(user) });
});

app.post('/api/login', limit, (req, res) => {
  const e = String(req.body?.email || '').trim().toLowerCase(), p = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
  if (!user || !bcrypt.compareSync(p, user.password_hash)) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  setSession(res, user); res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

function awardXp(user, amount, lesson = 0) {
  const t = today(), yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  let streak = user.streak;
  if (user.last_active !== t) streak = user.last_active === yesterday ? streak + 1 : 1;
  const todayXp = (user.today_date === t ? user.today_xp : 0) + amount;
  db.prepare('UPDATE users SET xp = xp + ?, streak = ?, last_active = ?, today_xp = ?, today_date = ?, lessons_done = lessons_done + ? WHERE id = ?')
    .run(amount, streak, t, todayXp, t, lesson, user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
}

// Savollar javoblarsiz yuboriladi
app.get('/api/quiz', auth, (req, res) => res.json({ questions: quiz.map(({ q, o }) => ({ q, o })) }));

// Javoblarni SERVER tekshiradi va XP beradi (brauzerda aldab bo'lmaydi)
app.post('/api/quiz/submit', auth, (req, res) => {
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length !== quiz.length) return res.status(400).json({ error: 'Noto\'g\'ri so\'rov' });
  const results = quiz.map((item, i) => ({ correct: answers[i] === item.a, answer: item.a, explanation: item.e }));
  const score = results.filter(r => r.correct).length;
  const capped = req.user.today_date === today() && req.user.today_xp >= 200; // XP farming'ga qarshi kunlik limit
  const xp = capped ? 0 : score * 10;
  const user = awardXp(req.user, xp, 1);
  res.json({ score, total: quiz.length, xp, results, user: publicUser(user) });
});

// Flashcard orqali kichik XP (kuniga cheklangan)
app.post('/api/flashcards/done', auth, (req, res) => {
  const u = req.user, t = today();
  if (u.today_date === t && u.today_xp >= 200) return res.json({ user: publicUser(u) });
  res.json({ user: publicUser(awardXp(u, 5, 0)) });
});

app.get('/api/leaderboard', auth, (req, res) => {
  res.json({ users: db.prepare('SELECT username, xp, streak FROM users ORDER BY xp DESC, id ASC LIMIT 10').all() });
});

app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) c, COALESCE(SUM(xp),0) x FROM users').get();
  const users = db.prepare('SELECT id, full_name, username, email, role, xp, created_at FROM users ORDER BY id DESC LIMIT 100').all();
  res.json({ totalUsers: total.c, totalXp: total.x, users });
});
app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id); res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Topilmadi' }));
app.listen(PORT, () => console.log(`ASILBEK SENSEI: http://localhost:${PORT}`));
