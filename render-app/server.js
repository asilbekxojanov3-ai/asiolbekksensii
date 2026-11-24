const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { DatabaseSync } = require("node:sqlite");

const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "asilbek-sensei.sqlite");
const SESSION_DAYS = 7;
const database = new DatabaseSync(DB_PATH);
database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL CHECK(level IN ('N5','N4','N3','N2','N1')),
    type TEXT NOT NULL CHECK(type IN ('Lug‘at','Grammatika','Kanji','O‘qish','Tinglash')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, lesson_id)
  );
`);

const seedLessons = [
  ["N5","Lug‘at","Salomlashish va tanishuv","こんにちは (konnichiwa) — salom. はじめまして (hajimemashite) — tanishganimdan xursandman. わたし (watashi) — men. Namuna: わたしはアリです。 — Men Aliman."],
  ["N5","Grammatika","は va です bilan tanishtirish","Qolip: A は B です。 は mavzuni bildiradi, です muloyim tasdiq yasaydi. わたしは学生です。 — Men talabaman. Mashq: わたしはウズベキスタン人です。 gapini tarjima qiling."],
  ["N5","Kanji","日 va 月 kanjilari","日: quyosh, kun; onyomi ニチ・ジツ, kunyomi ひ・か. 月: oy; onyomi ゲツ・ガツ, kunyomi つき. 日本 (にほん) — Yaponiya; 月曜日 (げつようび) — dushanba."],
  ["N5","O‘qish","Mening kunim","Matn: わたしはマリです。まいあさ七時におきます。パンを食べて、学校へ行きます。 Tarjima: Men Mariman. Har tong soat yettida turaman. Non yeb maktabga boraman. Savol: Mari soat nechada turadi?"],
  ["N5","Tinglash","Kafeda buyurtma","Dialogni ovoz chiqarib o‘qing: 店員「いらっしゃいませ。」客「水をください。」 店員「はい。」 So‘zlar: 水 (みず) — suv, ください — bering. Savol: mijoz nima so‘radi? Javob: suv."],
  ["N4","Lug‘at","Yo‘l so‘rash","駅 (えき) — bekat, 右 (みぎ) — o‘ng, 左 (ひだり) — chap, まっすぐ — to‘g‘ri. 駅はどこですか。 — Bekat qayerda?"],
  ["N4","Grammatika","～たことがあります","Fe’lning た shakli + ことがあります — biror ishni avval qilgan tajriba. 日本へ行ったことがあります。 — Yaponiyaga borib ko‘rganman. Inkor: 行ったことがありません."],
  ["N4","Kanji","会 va 社 kanjilari","会 (あう / カイ) — uchrashmoq, yig‘ilish; 社 (シャ) — tashkilot, ziyoratgoh. 会社 (かいしゃ) — kompaniya; 会話 (かいわ) — suhbat. Misol: 会社で日本語を話します。"],
  ["N4","O‘qish","Dam olish kunidagi reja","Matn: 土曜日、友だちと公園へ行きました。天気がよかったので、写真をたくさん撮りました。 Tarjima: Shanba kuni do‘stim bilan bog‘ga bordim. Havo yaxshi bo‘lgani uchun ko‘p surat oldim. Savol: nega surat ko‘p olindi?"],
  ["N4","Tinglash","Poyezd jadvalini tushunish","E’lon: 次の電車は三時十五分に出発します。 — Keyingi poyezd soat 3:15 da jo‘naydi. 三番線 — 3-platforma. Savol: poyezd qachon jo‘naydi? 3:15."],
  ["N3","Lug‘at","Ish va kundalik vazifalar","確認 (かくにん) — tekshirish, 予定 (よてい) — reja, 連絡 (れんらく) — xabar/aloqa. 予定を確認してから連絡します。 — Rejani tekshirib, keyin xabar beraman."],
  ["N3","Grammatika","～ようにする","Fe’l lug‘at shakli + ようにする — odat qilib bajarishga harakat qilish. 毎日新聞を読むようにしています。 — Har kuni gazeta o‘qishni odat qilganman. O‘zingizning o‘qish odatingiz haqida gap tuzing."],
  ["N3","Kanji","意 va 味 kanjilari","意 — fikr, niyat; 味 (あじ) — ta’m, ma’no. 意味 (いみ) — ma’no; 意見 (いけん) — fikr. この言葉の意味を説明してください。 — Bu so‘zning ma’nosini tushuntiring."],
  ["N3","O‘qish","Jamoat transporti va shahar","Matn: 最近、駅の近くに自転車を置く人が増えています。そのため、歩く人のための道がせまくなりました。市は駐輪場を作る予定です。 Mazmun: bekat atrofida velosipedlar ko‘paygani sabab piyodalar yo‘li toraygan; shahar velosiped turargohi qurmoqchi. Savol: shahar nima quradi?"],
  ["N3","Tinglash","Uchrashuv vaqtini o‘zgartirish","Dialog: A「会議は何時からですか。」B「三時の予定でしたが、四時に変更になりました。」 — Yig‘ilish 3 dan 4 ga o‘zgardi. Savol: yangi boshlanish vaqti qachon?"],
  ["N2","Lug‘at","Yangilik va jamiyat","影響 (えいきょう) — ta’sir, 対策 (たいさく) — chora, 状況 (じょうきょう) — vaziyat. 天候の影響で、イベントの予定が変更されました。 — Ob-havo ta’sirida tadbir rejasi o‘zgardi."],
  ["N2","Grammatika","～に伴って","Ot + に伴って — ... bilan birga, ... natijasida. 人口の増加に伴って、交通量も増えている。 — Aholi ko‘payishi bilan transport oqimi ham ortmoqda. Bu qolip rasmiy matnlarda ko‘p uchraydi."],
  ["N2","Kanji","環境 mavzusidagi kanjilar","環 (カン) — halqa/muhit, 境 (キョウ・さかい) — chegara, 保 (ホ・たもつ) — asramoq. 環境 (かんきょう) — atrof-muhit; 保護 (ほご) — himoya. 環境を守る活動が広がっています。"],
  ["N2","O‘qish","Shahar yashil hududlari","Matn: 都市の緑地は、気温を下げるだけでなく、住民が交流する場所としても重要である。一方、維持には費用と地域の協力が必要だ。 Mazmun: yashil hududlar salqinlik va jamoa uchrashuvlari uchun muhim, lekin ularni saqlash mablag‘ va hamkorlik talab qiladi. Savol: qanday ikki foyda aytilgan?"],
  ["N2","Tinglash","Rasmiy uchrashuvdagi taklif","Nutq: 資料をご覧ください。来月から試験的に実施し、結果を踏まえて本格導入を検討したいと思います。 — Taklif: kelasi oydan sinov tariqasida boshlash, natijalarga qarab to‘liq joriy etishni ko‘rib chiqish. Savol: avval nima qilinadi?"],
  ["N1","Lug‘at","Tahliliy matnlar lug‘ati","踏まえる (ふまえる) — hisobga olmoq, 妥当 (だとう) — asosli, 顕著 (けんちょ) — yaqqol. 調査結果を踏まえ、妥当な対策を検討する。 — Tadqiqot natijalarini hisobga olib, asosli choralarni ko‘rib chiqmoq."],
  ["N1","Grammatika","～を余儀なくされる","Ot + を余儀なくされる — majbur bo‘lmoq, rasmiy yozma uslub. 悪天候により、計画の変更を余儀なくされた。 — Noqulay ob-havo sabab rejani o‘zgartirishga majbur bo‘lindi. Odatda tashqi sabab va istalmagan natijani bildiradi."],
  ["N1","Kanji","抽象 tushunchalar kanjilari","顕 (ケン) — namoyon bo‘lmoq; 著 (チョ) — sezilarli; 概 (ガイ) — umumiy. 顕著 (けんちょ) — yaqqol; 著者 (ちょしゃ) — muallif; 概念 (がいねん) — tushuncha. 顕著な変化が見られた。 — Yaqqol o‘zgarish kuzatildi."],
  ["N1","O‘qish","Texnologiya va mas’uliyat","Matn: 技術の進歩は利便性を高める一方、予期せぬ影響をもたらす可能性もある。したがって、導入後の検証を継続し、社会的な合意形成を図る必要がある。 Mazmun: texnologiya qulaylik yaratadi, biroq kutilmagan oqibatlari bo‘lishi mumkin; joriy etilgandan keyin tekshiruv va ijtimoiy kelishuv zarur. Savol: muallif qaysi ikki ishni zarur deydi?"],
  ["N1","Tinglash","Ma’ruzaning asosiy xulosasi","Ma’ruza: 数値だけを比較しても、背景にある要因を考慮しなければ、実態を正確に把握できない。複数の資料を照合し、長期的な傾向を分析することが不可欠である。 Xulosa: raqamlarni yolg‘iz solishtirish yetmaydi; sabablarni hisobga olib, bir nechta manba va uzoq muddatli tendensiyani tahlil qilish kerak. Savol: nega faqat raqamlarni qiyoslash yetarli emas?"],
];

const count = database.prepare("SELECT COUNT(*) AS total FROM lessons").get().total;
if (count === 0) {
  const insert = database.prepare("INSERT INTO lessons(level,type,title,content) VALUES(?,?,?,?)");
  database.exec("BEGIN");
  try {
    seedLessons.forEach((row) => insert.run(...row));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function provisionAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) throw new Error("ADMIN_PASSWORD kamida 12 belgidan iborat bo‘lishi kerak.");
  const existing = database.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    database.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(existing.id);
    return;
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  const username = `admin_${crypto.randomBytes(5).toString("hex")}`;
  database.prepare("INSERT INTO users(name,username,email,password_salt,password_hash,is_admin) VALUES(?,?,?,?,?,1)")
    .run("Asilbek Sensei Admin", username, email, salt, hash.toString("hex"));
}

function send(response, status, data, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  response.end(JSON.stringify(data));
}

function cookieOptions() {
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20000) { reject(Object.assign(new Error("So‘rov juda katta."), { status: 413 })); request.destroy(); }
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(Object.assign(new Error("JSON ma’lumot noto‘g‘ri."), { status: 400 })); }
    });
    request.on("error", reject);
  });
}

function getUser(request) {
  const cookies = Object.fromEntries((request.headers.cookie || "").split(";").map((part) => part.trim().split(/=(.*)/s).slice(0, 2)).filter((pair) => pair.length === 2));
  const token = cookies.asilbek_session;
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const session = database.prepare("SELECT users.id, users.name, users.username, users.email, users.is_admin, sessions.expires_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=?").get(tokenHash);
  if (!session) return null;
  if (session.expires_at < Date.now()) { database.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash); return null; }
  return { ...session, tokenHash };
}

const requestsByIp = new Map();
function rateLimited(request) {
  const key = request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = requestsByIp.get(key) || { start: now, count: 0 };
  if (now - record.start > 15 * 60 * 1000) { record.start = now; record.count = 0; }
  record.count += 1;
  requestsByIp.set(key, record);
  return record.count > 30;
}

function validLesson(body) {
  return ["N5","N4","N3","N2","N1"].includes(body.level)
    && ["Lug‘at","Grammatika","Kanji","O‘qish","Tinglash"].includes(body.type)
    && typeof body.title === "string" && body.title.trim().length >= 3 && body.title.length <= 120
    && typeof body.content === "string" && body.content.trim().length >= 10 && body.content.length <= 5000;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const method = request.method;
  try {
    if (method === "POST" && ["/api/register", "/api/login"].includes(url.pathname) && rateLimited(request)) {
      return send(response, 429, { error: "Urinishlar ko‘payib ketdi. Birozdan keyin qayta urinib ko‘ring." });
    }
    if (["POST","PUT","DELETE"].includes(method) && url.pathname.startsWith("/api/")) {
      const origin = request.headers.origin;
      if (origin && new URL(origin).host !== request.headers.host) return send(response, 403, { error: "So‘rov manbasi ruxsat etilmagan." });
    }

    if (method === "GET" && url.pathname === "/api/session") {
      const user = getUser(request);
      return send(response, 200, { user: user ? { id: user.id, name: user.name, username: user.username, email: user.email, isAdmin: Boolean(user.is_admin) } : null });
    }
    if (method === "POST" && url.pathname === "/api/register") {
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const username = String(body.username || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{N}_-]{3,24}$/u.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 200) {
        return send(response, 400, { error: "Ism, username, email yoki parol talablarga mos emas. Parol kamida 10 belgidan iborat bo‘lsin." });
      }
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = await scrypt(password, salt, 64);
      let result;
      try { result = database.prepare("INSERT INTO users(name,username,email,password_salt,password_hash) VALUES(?,?,?,?,?)").run(name, username, email, salt, hash.toString("hex")); }
      catch { return send(response, 409, { error: "Bu email yoki username allaqachon ishlatilgan." }); }
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expires = Date.now() + SESSION_DAYS * 86400000;
      database.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").run(tokenHash, Number(result.lastInsertRowid), expires);
      return send(response, 201, { user: { id: Number(result.lastInsertRowid), name, username, email, isAdmin: false } }, { "Set-Cookie": `asilbek_session=${token}; ${cookieOptions()}` });
    }
    if (method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(request);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = database.prepare("SELECT * FROM users WHERE email=?").get(email);
      if (!user || !crypto.timingSafeEqual(await scrypt(password, user.password_salt, 64), Buffer.from(user.password_hash, "hex"))) return send(response, 401, { error: "Email yoki parol noto‘g‘ri." });
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expires = Date.now() + SESSION_DAYS * 86400000;
      database.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").run(tokenHash, user.id, expires);
      return send(response, 200, { user: { id: user.id, name: user.name, username: user.username, email: user.email, isAdmin: Boolean(user.is_admin) } }, { "Set-Cookie": `asilbek_session=${token}; ${cookieOptions()}` });
    }
    if (method === "POST" && url.pathname === "/api/logout") {
      const user = getUser(request);
      if (user) database.prepare("DELETE FROM sessions WHERE token_hash=?").run(user.tokenHash);
      return send(response, 200, { ok: true }, { "Set-Cookie": `asilbek_session=; ${cookieOptions().replace(/Max-Age=\d+/, "Max-Age=0")}` });
    }
    if (method === "GET" && url.pathname === "/api/lessons") {
      const lessons = database.prepare("SELECT id,level,type,title,content FROM lessons ORDER BY CASE level WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 WHEN 'N3' THEN 3 WHEN 'N2' THEN 4 ELSE 5 END,id").all();
      return send(response, 200, { lessons });
    }
    if (url.pathname.startsWith("/api/")) {
      const user = getUser(request);
      if (!user) return send(response, 401, { error: "Davom etish uchun hisobingizga kiring." });
      if (method === "GET" && url.pathname === "/api/progress") {
        const lessons = database.prepare("SELECT lesson_id AS lessonId, completed_at AS completedAt FROM progress WHERE user_id=?").all(user.id);
        return send(response, 200, { lessons });
      }
      if (method === "POST" && url.pathname === "/api/progress") {
        const body = await readBody(request);
        const lessonId = Number(body.lessonId);
        if (!Number.isInteger(lessonId) || !database.prepare("SELECT id FROM lessons WHERE id=?").get(lessonId)) return send(response, 400, { error: "Dars topilmadi." });
        database.prepare("INSERT OR IGNORE INTO progress(user_id,lesson_id) VALUES(?,?)").run(user.id, lessonId);
        return send(response, 200, { ok: true });
      }
      if (!user.is_admin) return send(response, 403, { error: "Bu amal uchun administrator huquqi kerak." });
      if (method === "POST" && url.pathname === "/api/lessons") {
        const body = await readBody(request);
        if (!validLesson(body)) return send(response, 400, { error: "Dars ma’lumotlarini tekshiring." });
        const result = database.prepare("INSERT INTO lessons(level,type,title,content) VALUES(?,?,?,?)").run(body.level, body.type, body.title.trim(), body.content.trim());
        return send(response, 201, { lesson: { id: Number(result.lastInsertRowid), ...body } });
      }
      const lessonMatch = url.pathname.match(/^\/api\/lessons\/(\d+)$/);
      if (lessonMatch && method === "PUT") {
        const body = await readBody(request);
        if (!validLesson(body)) return send(response, 400, { error: "Dars ma’lumotlarini tekshiring." });
        const result = database.prepare("UPDATE lessons SET level=?,type=?,title=?,content=? WHERE id=?").run(body.level, body.type, body.title.trim(), body.content.trim(), Number(lessonMatch[1]));
        if (!result.changes) return send(response, 404, { error: "Dars topilmadi." });
        return send(response, 200, { ok: true });
      }
      if (lessonMatch && method === "DELETE") {
        database.prepare("DELETE FROM lessons WHERE id=?").run(Number(lessonMatch[1]));
        return send(response, 200, { ok: true });
      }
      if (method === "GET" && url.pathname === "/api/admin/stats") {
        return send(response, 200, {
          users: database.prepare("SELECT COUNT(*) AS total FROM users WHERE is_admin=0").get().total,
          lessons: database.prepare("SELECT COUNT(*) AS total FROM lessons").get().total,
          completions: database.prepare("SELECT COUNT(*) AS total FROM progress").get().total,
        });
      }
      return send(response, 404, { error: "API yo‘li topilmadi." });
    }

    if (method !== "GET" && method !== "HEAD") return send(response, 405, { error: "Bu HTTP usuli qo‘llab-quvvatlanmaydi." });
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const publicFiles = new Map([["/index.html", "index.html"], ["/style.css", "style.css"], ["/app.js", "app.js"]]);
    const publicFile = publicFiles.get(requested);
    if (!publicFile) return send(response, 404, { error: "Sahifa topilmadi." });
    const filePath = path.join(__dirname, publicFile);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
      response.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; media-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      });
    if (method === "HEAD") return response.end();
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) send(response, error.status || 500, { error: error.status ? error.message : "Serverda xatolik yuz berdi." });
    else response.destroy();
  }
});

provisionAdmin().then(() => {
  server.listen(PORT, "0.0.0.0", () => console.log(`Asilbek Sensei http://localhost:${PORT} manzilida ishga tushdi.`));
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});

