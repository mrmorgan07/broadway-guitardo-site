/**
 * ==========================================================================
 * АДМИН-ПАНЕЛЬ
 * ==========================================================================
 * URL: /admin.html
 * Пароль: ADMIN_PASSWORD в файле .env (по умолчанию admin123)
 * ==========================================================================
 */

const TOKEN_KEY = "choir_admin_token";
const TAB_TITLES = {
  hero: "Главный экран",
  about: "О коллективе",
  team: "Команда",
  projects: "Афиша",
  recruitment: "В хор",
  contacts: "Контакты и соцсети",
  seo: "SEO и метаданные"
};

let siteData = null;
let activeTab = "hero";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Auth-Token": getToken() || ""
  };
}

function showStatus(msg, type = "success") {
  const bar = document.getElementById("statusBar");
  bar.textContent = msg;
  bar.className = `admin-status is-${type}`;
  bar.hidden = false;
  setTimeout(() => { bar.hidden = true; }, 4000);
}

async function apiCheck() {
  const res = await fetch("/api/auth/check", { headers: authHeaders() });
  const data = await res.json();
  return data.authenticated;
}

async function apiLogin(password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!res.ok) throw new Error("Неверный пароль");
  const data = await res.json();
  setToken(data.token);
}

async function apiLogout() {
  await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
  setToken(null);
}

async function apiLoad() {
  const res = await fetch("/api/content");
  if (!res.ok) throw new Error("Не удалось загрузить данные");
  return res.json();
}

async function apiSave(data) {
  const res = await fetch("/api/content", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Ошибка сохранения");
  }
}

async function apiUpload(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "X-Auth-Token": getToken() || "" },
    body: fd
  });
  if (!res.ok) throw new Error("Ошибка загрузки");
  return (await res.json()).url;
}

/* --- UI helpers --- */

function field(label, id, value = "", type = "text", full = false) {
  const cls = full ? "field field--full" : "field";
  if (type === "textarea") {
    return `<div class="${cls}"><label for="${id}">${label}</label><textarea id="${id}" data-path="${id}">${value}</textarea></div>`;
  }
  return `<div class="${cls}"><label for="${id}">${label}</label><input type="${type}" id="${id}" data-path="${id}" value="${esc(value)}"></div>`;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function uploadField(label, pathKey) {
  return `<div class="field field--full">
    <label>${label}</label>
    <div class="upload-row">
      <input type="text" data-path="${pathKey}" placeholder="URL изображения или загрузите файл">
      <input type="file" accept="image/*" data-upload-for="${pathKey}">
      <button type="button" class="btn btn-outline btn-sm" data-upload-btn="${pathKey}">Загрузить</button>
    </div>
  </div>`;
}

function buildPanels() {
  const panels = document.getElementById("adminPanels");
  panels.innerHTML = `
    <div class="admin-panel is-active" data-panel="hero">
      <div class="admin-section">
        <h3>Hero-заставка</h3>
        <div class="fields-grid">
          ${field("Заголовок", "hero.title", siteData.hero.title)}
          ${field("Подзаголовок", "hero.subtitle", siteData.hero.subtitle)}
          ${field("Надпись сверху", "hero.eyebrow", siteData.hero.eyebrow)}
          ${uploadField("Фоновое изображение (JPG/PNG)", "hero.backgroundImage")}
          ${field("Фон WebP (опционально)", "hero.backgroundWebp", siteData.hero.backgroundWebp)}
          ${field("Видео-трейлер (embed URL)", "videoTrailerUrl", siteData.videoTrailerUrl, "url", true)}
        </div>
      </div>
    </div>

    <div class="admin-panel" data-panel="about">
      <div class="admin-section">
        <h3>Текст о коллективе</h3>
        ${field("Описание", "about", siteData.about, "textarea", true)}
      </div>
      <div class="admin-section">
        <h3>Галерея (карусель)</h3>
        <div id="galleryEditor"></div>
        <button type="button" class="btn btn-outline btn-sm" id="addGalleryBtn">+ Добавить фото</button>
      </div>
    </div>

    <div class="admin-panel" data-panel="team">
      <div class="admin-section">
        <h3>Команда</h3>
        <div id="teamEditor"></div>
      </div>
    </div>

    <div class="admin-panel" data-panel="projects">
      <div class="admin-section">
        <h3>Спектакли в афише</h3>
        <div id="projectsEditor"></div>
        <button type="button" class="btn btn-outline" id="addProjectBtn">+ Добавить спектакль</button>
      </div>
    </div>

    <div class="admin-panel" data-panel="recruitment">
      <div class="admin-section">
        <h3>Приглашение в хор</h3>
        <div class="fields-grid">
          ${field("Текст", "recruitment", siteData.recruitment, "textarea", true)}
          ${field("Ссылка (Guitardo)", "recruitmentLink", siteData.recruitmentLink, "url", true)}
          ${uploadField("Фоновое изображение", "recruitmentBg")}
          ${field("Фон WebP", "recruitmentBgWebp", siteData.recruitmentBgWebp)}
        </div>
      </div>
    </div>

    <div class="admin-panel" data-panel="contacts">
      <div class="admin-section">
        <h3>Контакты и бренд</h3>
        <div class="fields-grid">
          ${field("Email", "contacts.email", siteData.contacts.email, "email")}
          ${field("Телефон (для ссылки)", "contacts.phone", siteData.contacts.phone)}
          ${field("Телефон (отображение)", "contacts.phoneDisplay", siteData.contacts.phoneDisplay)}
          ${field("Название", "brand.name", siteData.brand?.name)}
          ${field("Слоган", "brand.tagline", siteData.brand?.tagline)}
        </div>
      </div>
      <div class="admin-section">
        <h3>Соцсети</h3>
        <div class="fields-grid">
          ${field("ВКонтакте", "socialLinks.vk", siteData.socialLinks.vk, "url")}
          ${field("Telegram", "socialLinks.telegram", siteData.socialLinks.telegram, "url")}
          ${field("YouTube", "socialLinks.youtube", siteData.socialLinks.youtube, "url")}
        </div>
      </div>
    </div>

    <div class="admin-panel" data-panel="seo">
      <div class="admin-section">
        <h3>SEO и Open Graph</h3>
        <div class="fields-grid">
          ${field("Title", "seo.title", siteData.seo?.title, "text", true)}
          ${field("Description", "seo.description", siteData.seo?.description, "textarea", true)}
          ${field("Keywords", "seo.keywords", siteData.seo?.keywords, "text", true)}
          ${field("OG URL", "seo.ogUrl", siteData.seo?.ogUrl, "url")}
          ${field("OG Image", "seo.ogImage", siteData.seo?.ogImage, "url")}
        </div>
      </div>
    </div>`;

  fillPathValues();
  renderGalleryEditor();
  renderTeamEditor();
  renderProjectsEditor();
  bindUploadButtons();
}

function fillPathValues() {
  document.querySelectorAll("[data-path]").forEach((el) => {
    const val = getByPath(siteData, el.dataset.path);
    if (el.tagName === "TEXTAREA") el.value = val ?? "";
    else el.value = val ?? "";
  });
}

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function collectFormData() {
  document.querySelectorAll("[data-path]").forEach((el) => {
    setByPath(siteData, el.dataset.path, el.value.trim());
  });
  return siteData;
}

/* --- Gallery editor --- */

function renderGalleryEditor() {
  const wrap = document.getElementById("galleryEditor");
  wrap.innerHTML = siteData.gallery.map((g, i) => `
    <div class="gallery-item-admin" data-gallery="${i}">
      ${field("Подпись", `gallery.${i}.caption`, g.caption)}
      ${field("URL фото", `gallery.${i}.src`, g.src)}
      ${field("WebP", `gallery.${i}.webp`, g.webp)}
      <button type="button" class="btn btn-danger btn-sm" data-remove-gallery="${i}">✕</button>
    </div>`).join("");
  fillPathValues();
  wrap.querySelectorAll("[data-remove-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      siteData.gallery.splice(Number(btn.dataset.removeGallery), 1);
      renderGalleryEditor();
    });
  });
}

/* --- Team editor --- */

function renderTeamEditor() {
  const wrap = document.getElementById("teamEditor");
  wrap.innerHTML = siteData.team.map((m, i) => `
    <div class="team-card-admin admin-section">
      <h3>${m.role}</h3>
      <div class="fields-grid">
        ${field("Имя", `team.${i}.name`, m.name)}
        ${field("Должность", `team.${i}.role`, m.role)}
        ${field("Фото URL", `team.${i}.photo`, m.photo)}
        ${field("Фото WebP", `team.${i}.photoWebp`, m.photoWebp)}
        ${field("Биография", `team.${i}.bio`, m.bio, "textarea", true)}
        ${field("Регалии", `team.${i}.awards`, m.awards, "textarea", true)}
      </div>
    </div>`).join("");
  fillPathValues();
}

/* --- Projects editor --- */

function renderProjectsEditor() {
  const wrap = document.getElementById("projectsEditor");
  wrap.innerHTML = siteData.projects.map((p, i) => `
    <div class="project-card-admin" data-project="${i}">
      <header>
        <h4>${esc(p.title)}</h4>
        <button type="button" class="btn btn-danger btn-sm" data-remove-project="${i}">Удалить</button>
      </header>
      <div class="fields-grid">
        ${field("Название", `projects.${i}.title`, p.title)}
        ${field("Дата и время", `projects.${i}.date`, p.date)}
        ${field("Тег", `projects.${i}.tag`, p.tag)}
        ${field("Постер URL", `projects.${i}.poster`, p.poster)}
        ${field("Постер WebP", `projects.${i}.posterWebp`, p.posterWebp)}
        ${field("Описание", `projects.${i}.description`, p.description, "textarea", true)}
        ${field("Ссылка на билеты", `projects.${i}.ticketLink`, p.ticketLink, "url", true)}
      </div>
      <p style="margin:1rem 0 0.5rem;color:var(--color-muted);font-size:0.85rem">Солисты (имя — роль):</p>
      <div id="soloists-${i}"></div>
      <button type="button" class="btn btn-outline btn-sm" data-add-soloist="${i}">+ Солист</button>
      <p style="margin:1rem 0 0.5rem;color:var(--color-muted);font-size:0.85rem">Галерея сцены:</p>
      <div id="proj-gallery-${i}"></div>
      <button type="button" class="btn btn-outline btn-sm" data-add-gallery="${i}">+ Фото сцены</button>
    </div>`).join("");

  fillPathValues();

  siteData.projects.forEach((p, i) => {
    const soloWrap = document.getElementById(`soloists-${i}`);
    soloWrap.innerHTML = (p.soloists || []).map((s, si) => `
      <div class="soloist-row">
        <input type="text" data-soloist="${i}.${si}" value="${esc(s)}">
        <button type="button" class="btn btn-danger btn-sm" data-rm-soloist="${i}.${si}">✕</button>
      </div>`).join("");

    soloWrap.querySelectorAll("[data-rm-soloist]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [pi, si] = btn.dataset.rmSoloist.split(".").map(Number);
        siteData.projects[pi].soloists.splice(si, 1);
        renderProjectsEditor();
      });
    });

    const galWrap = document.getElementById(`proj-gallery-${i}`);
    galWrap.innerHTML = (p.gallery || []).map((g, gi) => `
      <div class="gallery-item-admin">
        ${field("URL", `projects.${i}.gallery.${gi}.src`, g.src)}
        ${field("WebP", `projects.${i}.gallery.${gi}.webp`, g.webp)}
        <button type="button" class="btn btn-danger btn-sm" data-rm-pg="${i}.${gi}">✕</button>
      </div>`).join("");
    fillPathValues();

    galWrap.querySelectorAll("[data-rm-pg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [pi, gi] = btn.dataset.rmPg.split(".").map(Number);
        siteData.projects[pi].gallery.splice(gi, 1);
        renderProjectsEditor();
      });
    });
  });

  wrap.querySelectorAll("[data-remove-project]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Удалить этот спектакль?")) return;
      siteData.projects.splice(Number(btn.dataset.removeProject), 1);
      renderProjectsEditor();
    });
  });

  document.querySelectorAll("[data-add-soloist]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.addSoloist);
      siteData.projects[i].soloists.push("Имя — роль");
      renderProjectsEditor();
    });
  });

  document.querySelectorAll("[data-add-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.addGallery);
      siteData.projects[i].gallery.push({ src: "", webp: "", alt: "Сцена" });
      renderProjectsEditor();
    });
  });
}

function bindUploadButtons() {
  document.querySelectorAll("[data-upload-btn]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.uploadBtn;
      const fileInput = document.querySelector(`[data-upload-for="${key}"]`);
      const textInput = document.querySelector(`[data-path="${key}"]`);
      if (!fileInput?.files?.[0]) {
        showStatus("Выберите файл для загрузки", "error");
        return;
      }
      try {
        btn.disabled = true;
        const url = await apiUpload(fileInput.files[0]);
        textInput.value = url;
        showStatus("Изображение загружено");
      } catch {
        showStatus("Ошибка загрузки", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function collectSoloists() {
  document.querySelectorAll("[data-soloist]").forEach((input) => {
    const [pi, si] = input.dataset.soloist.split(".").map(Number);
    siteData.projects[pi].soloists[si] = input.value.trim();
  });
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById("panelTitle").textContent = TAB_TITLES[tab];
  document.querySelectorAll(".admin-nav-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".admin-panel").forEach((p) => {
    p.classList.toggle("is-active", p.dataset.panel === tab);
  });
}

function showApp(show) {
  document.getElementById("loginScreen").hidden = show;
  document.getElementById("adminApp").hidden = !show;
}

async function initAdmin() {
  siteData = await apiLoad();
  buildPanels();

  document.getElementById("adminNav").addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-nav-btn");
    if (btn) switchTab(btn.dataset.tab);
  });

  document.getElementById("saveBtn").addEventListener("click", async () => {
    try {
      collectFormData();
      collectSoloists();
      await apiSave(siteData);
      showStatus("✓ Изменения сохранены");
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  document.getElementById("addGalleryBtn")?.addEventListener("click", () => {
    siteData.gallery.push({ caption: "Новое фото", src: "", webp: "", alt: "" });
    renderGalleryEditor();
  });

  document.getElementById("addProjectBtn")?.addEventListener("click", () => {
    const maxId = siteData.projects.reduce((m, p) => Math.max(m, p.id || 0), 0);
    siteData.projects.push({
      id: maxId + 1,
      title: "Новый спектакль",
      date: "Дата, время",
      tag: "Мюзикл",
      poster: "",
      posterWebp: "",
      description: "",
      gallery: [],
      soloists: [],
      ticketLink: ""
    });
    renderProjectsEditor();
    switchTab("projects");
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await apiLogout();
    showApp(false);
  });
}

/* --- Init --- */

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("loginError");
  try {
    await apiLogin(document.getElementById("loginPassword").value);
    errEl.hidden = true;
    showApp(true);
    await initAdmin();
  } catch {
    errEl.textContent = "Неверный пароль";
    errEl.hidden = false;
  }
});

(async () => {
  if (getToken() && (await apiCheck())) {
    showApp(true);
    await initAdmin();
  }
})();
