// ASILBEK SENSEI - umumiy JavaScript
// 1) api()  - serverga so'rov yuboradi
// 2) renderNav() - navigatsiya (kirgan/kirmagan holatga qarab)
// 3) sahifaga xos funksiyalar (pages obyektida)

const T = {
  uz: { home: "Bosh sahifa", courses: "Kurslar", vocab: "Lug'at", grammar: "Grammatika", quiz: "Test", rank: "Reyting",
        dash: "Dashboard", profile: "Profil", logout: "Chiqish", login: "Kirish", start: "Boshlash", admin: "Admin",
        heroTitle: "Yapon tilini o'zbek tilida o'rganing", heroText: "JLPT N5 dan N1 gacha. Oddiy, chiroyli va samarali." },
  ja: { home: "ホーム", courses: "コース", vocab: "単語", grammar: "文法", quiz: "テスト", rank: "ランキング",
        dash: "ダッシュボード", profile: "プロフィール", logout: "ログアウト", login: "ログイン", start: "始める", admin: "管理",
        heroTitle: "ウズベク語で日本語を学ぼう", heroText: "JLPT N5からN1まで。シンプルで、美しく、効果的。" }
};
let lang = localStorage.getItem('lang') || 'uz';
const t = (k) => T[lang][k];
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, method = 'GET', body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Xatolik'), { status: res.status });
  return data;
}

async function getUser() { try { return (await api('/api/me')).user; } catch { return null; } }

function renderNav(user) {
  const here = location.pathname.split('/').pop() || 'index.html';
  const link = (h, k) => `<li><a href="${h}" class="${here === h ? 'active' : ''}">${t(k)}</a></li>`;
  const auth = user
    ? link('dashboard.html', 'dash') + link('profile.html', 'profile') + (user.role === 'admin' ? link('admin.html', 'admin') : '') + `<li><a href="#" id="logout">${t('logout')}</a></li>`
    : link('login.html', 'login') + `<li><a href="register.html" class="active">${t('start')}</a></li>`;
  const nav = $('nav') || document.body.insertBefore(document.createElement('nav'), document.body.children[1]);
  nav.innerHTML = `<ul>${link('index.html', 'home')}${link('jlpt.html', 'courses')}${link('vocabulary.html', 'vocab')}${link('grammar.html', 'grammar')}${link('quiz.html', 'quiz')}${link('leaderboard.html', 'rank')}
    <li class="spacer"></li>${auth}<li><button class="ghost lang" id="lang">${lang === 'uz' ? '日本語' : "O'zbekcha"}</button></li></ul>`;
  $('#lang').onclick = () => { lang = lang === 'uz' ? 'ja' : 'uz'; localStorage.setItem('lang', lang); location.reload(); };
  const lo = $('#logout');
  if (lo) lo.onclick = async (e) => { e.preventDefault(); await api('/api/logout', 'POST'); location.href = 'index.html'; };
}

// ---------- Sahifalar ----------
const pages = {
  index(user) {
    $('#hero-title').textContent = t('heroTitle');
    $('#hero-text').textContent = t('heroText');
    $('#cta').innerHTML = user ? `<a class="btn" href="dashboard.html">${t('dash')}</a>` : `<a class="btn" href="register.html">${t('start')}</a> <a class="btn ghost" href="login.html">${t('login')}</a>`;
  },

  register() {
    $('#form').onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      try { await api('/api/register', 'POST', d); location.href = 'dashboard.html'; }
      catch (err) { $('#error').textContent = err.message; }
    };
  },

  login() {
    $('#form').onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      try { await api('/api/login', 'POST', d); location.href = 'dashboard.html'; }
      catch (err) { $('#error').textContent = err.message; }
    };
  },

  dashboard(user) {
    const pct = Math.min(100, Math.round(user.todayXp / user.dailyGoal * 100));
    $('#welcome').textContent = `Xush kelibsiz, ${user.fullName}!`;
    $('#stats').innerHTML = [['XP', user.xp], ['Daraja', user.level], ['Streak', user.streak + ' kun'], ['Darslar', user.lessonsDone]]
      .map(([k, v]) => `<div class="stat"><b>${esc(v)}</b><span>${k}</span></div>`).join('');
    $('#goal-text').textContent = `${user.todayXp} / ${user.dailyGoal} XP`;
    requestAnimationFrame(() => $('#goal-bar').style.width = pct + '%');
  },

  profile(user) {
    $('#profile').innerHTML = `<tr><th colspan="2">${esc(user.fullName)}</th></tr>` +
      [['Username', '@' + user.username], ['Email', user.email], ['JLPT', user.jlptLevel], ['XP', user.xp], ['Daraja', user.level], ['Streak', user.streak + ' kun'], ['Tugatilgan darslar', user.lessonsDone],
       ['Yutuqlar', [user.lessonsDone >= 1 && 'Birinchi test', user.streak >= 3 && '3 kunlik streak', user.xp >= 100 && '100 XP'].filter(Boolean).join(', ') || '-']]
      .map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('');
  },

  vocabulary() {
    const words = [['学生', 'がくせい', 'gakusei', 'talaba'], ['先生', 'せんせい', 'sensei', "o'qituvchi"], ['水', 'みず', 'mizu', 'suv'], ['日本', 'にほん', 'nihon', 'Yaponiya'],
      ['本', 'ほん', 'hon', 'kitob'], ['友達', 'ともだち', 'tomodachi', "do'st"], ['学校', 'がっこう', 'gakkou', 'maktab'], ['ありがとう', 'ありがとう', 'arigatou', 'rahmat']];
    let i = 0, seen = 0;
    const card = $('#flash');
    const show = () => {
      const [k, h, r, u] = words[i];
      card.classList.remove('flipped');
      $('#front').innerHTML = `<div class="big">${k}</div>`;
      $('#back').innerHTML = `<div class="big">${u}</div><p class="muted">${h} · ${r}</p>`;
      $('#count').textContent = `${i + 1} / ${words.length}`;
    };
    const speak = () => { const s = new SpeechSynthesisUtterance(words[i][1]); s.lang = 'ja-JP'; speechSynthesis.cancel(); speechSynthesis.speak(s); };
    card.onclick = () => card.classList.toggle('flipped');
    $('#audio').onclick = speak;
    $('#prev').onclick = () => { i = (i - 1 + words.length) % words.length; show(); };
    $('#next').onclick = async () => {
      i = (i + 1) % words.length; show();
      if (++seen % words.length === 0 && await getUser()) api('/api/flashcards/done', 'POST').then(() => $('#xpmsg').textContent = '+5 XP!').catch(() => {});
    };
    show();
  },

  async quiz() {
    const { questions } = await api('/api/quiz');
    const answers = questions.map(() => -1);
    $('#questions').innerHTML = questions.map((q, qi) => `<div class="q"><b>${qi + 1}. ${esc(q.q)}</b>${q.o.map((o, oi) => `<button class="opt" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join('')}<div class="note" id="e${qi}"></div></div>`).join('');
    $('#questions').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || $('#submit').disabled) return;
      const qi = +b.dataset.q; answers[qi] = +b.dataset.o;
      document.querySelectorAll(`[data-q="${qi}"]`).forEach(x => x.classList.toggle('sel', x === b));
    };
    $('#submit').onclick = async () => {
      if (answers.includes(-1)) return $('#error').textContent = 'Barcha savollarga javob bering';
      $('#error').textContent = ''; $('#submit').disabled = true;
      const r = await api('/api/quiz/submit', 'POST', { answers });
      r.results.forEach((res, qi) => {
        document.querySelectorAll(`[data-q="${qi}"]`).forEach((b, oi) => { b.classList.remove('sel'); if (oi === res.answer) b.classList.add('ok'); else if (oi === answers[qi]) b.classList.add('bad'); });
        $('#e' + qi).textContent = res.explanation;
      });
      $('#result').innerHTML = `<div class="card center"><h3>${r.score} / ${r.total}</h3><p>+${r.xp} XP oldingiz!</p><a class="btn" href="dashboard.html">Dashboard</a></div>`;
      $('#result').scrollIntoView({ behavior: 'smooth' });
    };
  },

  async leaderboard() {
    const { users } = await api('/api/leaderboard');
    $('#rows').innerHTML = users.map((u, i) => `<tr><td>${i + 1}</td><td>@${esc(u.username)}</td><td>${u.xp}</td><td>${u.streak}</td></tr>`).join('') || '<tr><td colspan="4">Hozircha bo\'sh</td></tr>';
  },

  async admin(user) {
    if (user.role !== 'admin') return $('main').innerHTML = '<h2>Ruxsat yo\'q</h2>';
    const load = async () => {
      const s = await api('/api/admin/stats');
      $('#astats').innerHTML = `<div class="stat"><b>${s.totalUsers}</b><span>Foydalanuvchilar</span></div><div class="stat"><b>${s.totalXp}</b><span>Jami XP</span></div>`;
      $('#users').innerHTML = s.users.map(u => `<tr><td>${esc(u.full_name)}</td><td>@${esc(u.username)}</td><td>${esc(u.email)}</td><td>${u.xp}</td><td>${u.role === 'admin' ? 'admin' : `<button class="ghost" data-del="${u.id}">O'chirish</button>`}</td></tr>`).join('');
    };
    $('#users').onclick = async (e) => {
      const id = e.target.dataset.del;
      if (id && confirm('Foydalanuvchini o\'chirasizmi?')) { await api('/api/admin/users/' + id, 'DELETE'); load(); }
    };
    load();
  }
};

const PRIVATE = ['dashboard', 'profile', 'quiz', 'leaderboard', 'admin'];
(async function init() {
  const page = document.body.dataset.page;
  const user = await getUser();
  renderNav(user);
  if (PRIVATE.includes(page) && !user) return (location.href = 'login.html');
  if (['login', 'register'].includes(page) && user) return (location.href = 'dashboard.html');
  try { await pages[page]?.(user); } catch (err) { if (err.status === 401) location.href = 'login.html'; else console.error(err); }
})();
