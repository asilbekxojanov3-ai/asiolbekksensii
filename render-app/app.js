const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
let currentUser = null;
let lessons = [];
let completedIds = new Set();

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(result.error || "So‘rov bajarilmadi.");
  return result;
}

const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  mainNav.classList.toggle("is-open", !open);
});
mainNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuButton?.setAttribute("aria-expanded", "false");
  mainNav.classList.remove("is-open");
}));

function lessonCard(lesson, admin = false) {
  const article = document.createElement("article");
  article.className = "library-card";
  const meta = document.createElement("p");
  meta.className = "lesson-meta";
  meta.textContent = `${lesson.level} · ${lesson.type}`;
  const title = document.createElement("h3");
  title.textContent = lesson.title;
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Darsni ochish";
  const content = document.createElement("p");
  content.className = "lesson-content";
  content.textContent = lesson.content;
  details.append(summary, content);
  article.append(meta, title, details);
  if (lesson.type === "Tinglash") {
    const listen = document.createElement("button");
    listen.type = "button";
    listen.className = "listen-lesson";
    listen.textContent = "Yaponcha matnni tinglash";
    listen.addEventListener("click", () => {
      const japanese = lesson.content.match(/[\u3040-\u30ff\u3400-\u9fff「」。、！？\s]{4,}/u)?.[0]?.trim();
      if (!japanese || !("speechSynthesis" in window)) { listen.textContent = "Talaffuz bu brauzerda mavjud emas"; return; }
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(japanese);
      utterance.lang = "ja-JP";
      speechSynthesis.speak(utterance);
    });
    article.append(listen);
  }

  if (admin) {
    const controls = document.createElement("div");
    controls.className = "lesson-controls";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Tahrirlash";
    edit.addEventListener("click", () => fillLessonForm(lesson));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "O‘chirish";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`“${lesson.title}” darsini o‘chirasizmi?`)) return;
      try { await api(`/api/lessons/${lesson.id}`, { method: "DELETE" }); await loadLessons(); }
      catch (error) { showAdminMessage(error.message); }
    });
    controls.append(edit, remove);
    article.append(controls);
  } else if (currentUser) {
    const done = completedIds.has(Number(lesson.id));
    const complete = document.createElement("button");
    complete.type = "button";
    complete.className = "complete-lesson";
    complete.textContent = done ? "Dars tugallandi ✓" : "Darsni tugatish · +10 XP";
    complete.disabled = done;
    complete.addEventListener("click", async () => {
      try {
        await api("/api/progress", { method: "POST", body: JSON.stringify({ lessonId: Number(lesson.id) }) });
        completedIds.add(Number(lesson.id));
        renderLessons();
        renderProfile();
      } catch (error) { window.alert(error.message); }
    });
    article.append(complete);
  }
  return article;
}

function renderLessons() {
  const list = document.querySelector("#lesson-list");
  if (!list) return;
  const level = document.querySelector("#level-filter").value;
  const type = document.querySelector("#type-filter").value;
  const filtered = lessons.filter((lesson) => (level === "all" || lesson.level === level) && (type === "all" || lesson.type === type));
  list.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p"); empty.textContent = "Bu tanlovda dars topilmadi."; list.append(empty); return;
  }
  filtered.forEach((lesson) => list.append(lessonCard(lesson)));
}

function showAdminMessage(message) {
  const target = document.querySelector("#admin-message");
  if (target) target.textContent = message;
}

function renderAdmin() {
  const section = document.querySelector("#admin");
  section.hidden = !currentUser?.isAdmin;
  if (!currentUser?.isAdmin) return;
  const list = document.querySelector("#admin-lessons");
  list.replaceChildren();
  lessons.forEach((lesson) => list.append(lessonCard(lesson, true)));
  api("/api/admin/stats").then((stats) => {
    document.querySelector("#admin-stats").textContent = `Foydalanuvchilar: ${stats.users} · Darslar: ${stats.lessons} · Tugallangan darslar: ${stats.completions}`;
  }).catch(() => {});
}

function fillLessonForm(lesson) {
  const form = document.querySelector("#lesson-form");
  form.elements.id.value = lesson.id;
  form.elements.level.value = lesson.level;
  form.elements.type.value = lesson.type;
  form.elements.title.value = lesson.title;
  form.elements.content.value = lesson.content;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderProfile() {
  const target = document.querySelector("#profile-summary");
  const progress = document.querySelector("#kurs-progressi");
  if (!currentUser) {
    target.innerHTML = '<p>Rivojlanishingizni saqlash uchun <a href="#kirish">hisobingizga kiring</a> yoki <a href="#royxatdan-otish">yangi hisob yarating</a>.</p>';
    progress.value = 0;
    document.querySelector("#dashboard-completed").textContent = "0";
    document.querySelector("#dashboard-percent").textContent = "0%";
    document.querySelector("#dashboard-xp").textContent = "0";
    const achievements = document.querySelector("#profile-achievements");
    const item = document.createElement("li"); item.textContent = "Yutuqlaringiz saqlanishi uchun hisobingizga kiring.";
    achievements.replaceChildren(item);
    return;
  }
  const done = completedIds.size;
  const selectedLevel = LEVELS.find((level) => lessons.some((lesson) => lesson.level === level && !completedIds.has(Number(lesson.id)))) || "N1";
  const d = document.createElement("dl");
  const entries = [["Ism", currentUser.name], ["Email", currentUser.email], ["Joriy JLPT darajasi", selectedLevel], ["Tugallangan darslar", String(done)], ["XP", String(done * 10)], ["Saqlanish joyi", "Hisobingiz · server bazasi"]];
  for (const [label, value] of entries) {
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    d.append(dt, dd);
  }
  target.replaceChildren(d);
  progress.value = lessons.length ? Math.round(done / lessons.length * 100) : 0;
  document.querySelector("#dashboard-completed").textContent = String(done);
  document.querySelector("#dashboard-percent").textContent = `${progress.value}%`;
  document.querySelector("#dashboard-xp").textContent = String(done * 10);
  document.querySelector("#xp-result").textContent = `Darslarni tugatib XP to‘plang. Jami: ${done * 10} XP.`;
  const achievements = document.querySelector("#profile-achievements");
  const badges = [];
  if (done >= 1) badges.push("Birinchi qadam — birinchi darsni tugatdingiz.");
  if (done >= 5) badges.push("Muntazam o‘quvchi — 5 ta darsni yakunladingiz.");
  if (done >= 10) badges.push("Bilim izlovchi — 10 ta darsni yakunladingiz.");
  if (!badges.length) badges.push("Birinchi darsingizni tugatganingizdan keyin yutuqlar shu yerda ko‘rinadi.");
  achievements.replaceChildren(...badges.map((badge) => { const item = document.createElement("li"); item.textContent = badge; return item; }));
}

async function refreshSession() {
  try {
    const { user } = await api("/api/session");
    currentUser = user;
    if (user) {
      const result = await api("/api/progress");
      completedIds = new Set(result.lessons.map((item) => Number(item.lessonId)));
    } else completedIds = new Set();
  } catch { currentUser = null; completedIds = new Set(); }
  renderLessons();
  renderProfile();
  renderAdmin();
  const actions = document.querySelector(".header-actions");
  actions.querySelector(".account-name")?.remove();
  actions.querySelector(".logout-header")?.remove();
  actions.querySelector(".admin-header")?.remove();
  if (currentUser) {
    const name = document.createElement("span"); name.className = "account-name"; name.textContent = currentUser.name;
    const logout = document.createElement("button"); logout.type = "button"; logout.className = "logout-header"; logout.textContent = "Chiqish";
    logout.addEventListener("click", logoutUser);
    actions.append(name, logout);
    if (currentUser.isAdmin) {
      const adminLink = document.createElement("a"); adminLink.className = "admin-header"; adminLink.href = "#admin"; adminLink.textContent = "Admin";
      actions.prepend(adminLink);
    }
  }
}

async function loadLessons() {
  try {
    const result = await api("/api/lessons");
    lessons = result.lessons;
    renderLessons();
    renderAdmin();
    renderProfile();
  } catch {
    const list = document.querySelector("#lesson-list");
    list.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "Darslarni ko‘rish uchun loyihani Node.js serverida ishga tushiring (npm start).";
    list.append(message);
  }
}

document.querySelector("#level-filter")?.addEventListener("change", renderLessons);
document.querySelector("#type-filter")?.addEventListener("change", renderLessons);

document.querySelectorAll("[data-auth]").forEach((form) => form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const message = form.querySelector(".form-message");
  const isRegister = form.dataset.auth === "register";
  const password = String(data.get("password"));
  if (isRegister && password !== String(data.get("confirmPassword"))) {
    message.textContent = "Parollar bir xil emas. Qaytadan tekshiring.";
    return;
  }
  const payload = isRegister
    ? { name: data.get("name"), username: data.get("username"), email: data.get("email"), password }
    : { email: data.get("email"), password };
  try {
    const result = await api(`/api/${form.dataset.auth}`, { method: "POST", body: JSON.stringify(payload) });
    message.textContent = `Xush kelibsiz, ${result.user.name}! Hisobingiz saqlandi.`;
    form.reset();
    await refreshSession();
    if (currentUser?.isAdmin) document.querySelector("#admin").scrollIntoView({ behavior: "smooth" });
  } catch (error) { message.textContent = error.message; }
}));

async function logoutUser() {
  try { await api("/api/logout", { method: "POST", body: "{}" }); } catch { /* session may already have expired */ }
  currentUser = null;
  completedIds = new Set();
  await refreshSession();
}
document.querySelector("#logout-button")?.addEventListener("click", logoutUser);

const lessonForm = document.querySelector("#lesson-form");
lessonForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(lessonForm);
  const lesson = { level: data.get("level"), type: data.get("type"), title: data.get("title"), content: data.get("content") };
  try {
    if (data.get("id")) await api(`/api/lessons/${data.get("id")}`, { method: "PUT", body: JSON.stringify(lesson) });
    else await api("/api/lessons", { method: "POST", body: JSON.stringify(lesson) });
    lessonForm.reset();
    lessonForm.elements.id.value = "";
    showAdminMessage("Dars muvaffaqiyatli saqlandi.");
    await loadLessons();
  } catch (error) { showAdminMessage(error.message); }
});
document.querySelector("#cancel-edit")?.addEventListener("click", () => {
  lessonForm.reset(); lessonForm.elements.id.value = ""; showAdminMessage("");
});

document.querySelector("#quiz-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const answer = new FormData(event.currentTarget).get("savol1");
  const result = document.querySelector("#natija");
  if (answer !== "suv") {
    result.textContent = "Hali to‘g‘ri emas. 水 (みず / mizu) — suv degani. Yana urinib ko‘ring!";
    return;
  }
  result.textContent = "To‘g‘ri! 水 (みず / mizu) — suv degani. Darsni tugatib XP oling.";
});

document.querySelector("#speak-word")?.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) { document.querySelector("#speak-word").textContent = "Bu brauzer talaffuzni qo‘llamaydi"; return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("みず"); utterance.lang = "ja-JP"; speechSynthesis.speak(utterance);
});

document.querySelector("#speak-listening")?.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("おはようございます。わたしはアリです。");
  utterance.lang = "ja-JP";
  speechSynthesis.speak(utterance);
});

document.querySelector("#flip-card")?.addEventListener("click", (event) => {
  const card = event.currentTarget.closest("article");
  const translation = card.querySelector("dl dd:last-of-type");
  const sentence = card.querySelector("p:nth-of-type(2)");
  const show = translation.hidden;
  translation.hidden = !show;
  if (sentence) sentence.hidden = !show;
  event.currentTarget.textContent = show ? "Tarjimani yashirish" : "Tarjimani ko‘rsatish";
});

async function start() {
  await Promise.all([loadLessons(), refreshSession()]);
}
start();

