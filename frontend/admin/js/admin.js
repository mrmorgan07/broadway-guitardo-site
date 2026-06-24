/**
 * ==========================================================================
 * АДМИН-ПАНЕЛЬ — логика CMS
 * ==========================================================================
 * URL: /admin
 * Логин по умолчанию: admin / 12345
 * Токен и CSRF хранятся в sessionStorage.
 *
 * Расширение: чтобы добавить поле в спектакль —
 * 1) добавьте в backend/data/db.json
 * 2) добавьте поле в renderProjectEdit() ниже
 * 3) добавьте обработку в saveProject()
 * ==========================================================================
 */

const AUTH = { token: "choir_token", csrf: "choir_csrf" };
let db = null;
let editingProjectId = null;
let confirmCallback = null;
const confirmModal = () => new bootstrap.Modal(document.getElementById("confirmModal"));

/* --- API --- */

function headers(json = true) {
  const h = {
    "X-Auth-Token": sessionStorage.getItem(AUTH.token) || "",
    "X-CSRF-Token": sessionStorage.getItem(AUTH.csrf) || ""
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...headers(opts.body !== undefined && !(opts.body instanceof FormData)), ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

// uploadFile определена ниже в разделе «Медиатека»

/* --- Toast --- */

function toast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap");
  const id = `t${Date.now()}`;
  wrap.insertAdjacentHTML("beforeend", `
    <div id="${id}" class="toast align-items-center text-bg-${type === "success" ? "success" : "danger"} border-0" role="alert">
      <div class="d-flex"><div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>
    </div>`);
  const el = document.getElementById(id);
  const t = new bootstrap.Toast(el, { delay: 3500 });
  t.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

function confirmDialog(text, onOk) {
  document.getElementById("confirmText").textContent = text;
  confirmCallback = onOk;
  confirmModal().show();
}

document.getElementById("confirmOk").addEventListener("click", () => {
  confirmModal().hide();
  confirmCallback?.();
  confirmCallback = null;
});

/* --- Auth --- */

async function checkAuth() {
  const res = await fetch("/api/auth/check", { headers: headers() });
  const data = await res.json();
  return data.authenticated;
}

function showApp(show) {
  document.getElementById("loginScreen").classList.toggle("d-none", show);
  document.getElementById("adminApp").classList.toggle("d-none", !show);
  if (!show) { sessionStorage.removeItem(AUTH.token); sessionStorage.removeItem(AUTH.csrf); }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("loginError");
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        login: document.getElementById("loginUser").value,
        password: document.getElementById("loginPass").value
      })
    });
    sessionStorage.setItem(AUTH.token, data.token);
    sessionStorage.setItem(AUTH.csrf, data.csrfToken);
    err.classList.add("d-none");
    showApp(true);
    await initApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove("d-none");
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST" }); } catch { /* ignore */ }
  showApp(false);
});

/* --- Navigation --- */

function showView(name) {
  document.querySelectorAll(".admin-view").forEach((v) => v.classList.add("d-none"));
  document.querySelectorAll("#sideNav .nav-link").forEach((b) => b.classList.remove("active"));

  const map = {
    dashboard: "viewDashboard",
    projects: "viewProjects",
    projectEdit: "viewProjectEdit",
    hero: "viewHero",
    about: "viewAbout",
    director: "viewDirector",
    concertmaster: "viewConcertmaster",
    choir: "viewChoir",
    contacts: "viewContacts",
    location: "viewLocation",
    media: "viewMedia",
    password: "viewPassword"
  };
  document.getElementById(map[name])?.classList.remove("d-none");
  document.querySelector(`#sideNav [data-view="${name === "projectEdit" ? "projects" : name}"]`)?.classList.add("active");
}

document.getElementById("sideNav").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  showView(btn.dataset.view);
  if (btn.dataset.view === "dashboard") renderDashboard();
  if (btn.dataset.view === "projects") renderProjectsList();
  if (btn.dataset.view === "hero") renderHeroSection();
  if (btn.dataset.view === "about") renderAbout();
  if (btn.dataset.view === "director") renderDirector();
  if (btn.dataset.view === "concertmaster") renderConcertmaster();
  if (btn.dataset.view === "choir") renderChoir();
  if (btn.dataset.view === "contacts") renderContacts();
  if (btn.dataset.view === "location") renderLocation();
  if (btn.dataset.view === "media") renderMedia();
  if (btn.dataset.view === "password") renderPassword();
});

/* --- Dashboard --- */

function renderDashboard() {
  const photoCount = (db.about?.photos?.length || 0) +
    (db.projects || []).reduce((s, p) => s + (p.gallery?.length || 0) + (p.poster ? 1 : 0), 0);
  document.getElementById("viewDashboard").innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">Добро пожаловать!</h2>
    <div class="row g-3">
      <div class="col-md-4"><div class="stat-card"><div class="text-muted small">Спектаклей</div><div class="fs-2">${db.projects?.length || 0}</div></div></div>
      <div class="col-md-4"><div class="stat-card"><div class="text-muted small">Фото в галереях</div><div class="fs-2">${photoCount}</div></div></div>
      <div class="col-md-4"><div class="stat-card"><div class="text-muted small">Ближайший показ</div><div class="fs-5 mt-2">${db.projects?.[0]?.title || "—"}</div></div></div>
    </div>
    <p class="text-muted mt-4">Изменения на сайте видны сразу после сохранения и обновления страницы.</p>`;
}

/* --- Projects list --- */

function renderProjectsList() {
  const el = document.getElementById("viewProjects");
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 style="font-family:var(--font-heading)">Спектакли</h2>
      <button class="btn btn-gold" id="addProjectBtn">+ Добавить спектакль</button>
    </div>
    <div class="table-responsive">
      <table class="table table-dark table-hover align-middle">
        <thead><tr><th>Название</th><th>Дата</th><th>Тег</th><th></th></tr></thead>
        <tbody id="projectsTableBody"></tbody>
      </table>
    </div>`;

  const tbody = document.getElementById("projectsTableBody");
  tbody.innerHTML = (db.projects || []).map((p) => `
    <tr>
      <td><strong>${esc(p.title)}</strong><br><small class="text-muted">${esc(p.id)}</small></td>
      <td>${esc(p.date)}</td>
      <td><span class="badge bg-secondary">${esc(p.tag)}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-warning me-1" data-edit="${p.id}">Редактировать</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Удалить</button>
      </td>
    </tr>`).join("");

  document.getElementById("addProjectBtn").onclick = () => openProjectEdit(null);
  tbody.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => openProjectEdit(b.dataset.edit));
  tbody.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => deleteProject(b.dataset.del));
}

function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

/* --- Project editor --- */

function openProjectEdit(id) {
  editingProjectId = id;
  const p = id ? db.projects.find((x) => x.id === id) : {
    id: "", title: "", date: "", tag: "", description: "", poster: "", gallery: [], soloists: [], ticketLink: "",
    duration: "", priceFrom: "", priceTo: ""
  };
  showView("projectEdit");

  document.getElementById("viewProjectEdit").innerHTML = `
    <div class="d-flex justify-content-between mb-4">
      <h2 style="font-family:var(--font-heading)">${id ? "Редактировать" : "Новый"} спектакль</h2>
      <button class="btn btn-outline-secondary" id="backToList">← К списку</button>
    </div>
    <form id="projectForm" class="card bg-dark border-secondary">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-8">
            <label class="form-label">Название *</label>
            <input class="form-control" name="title" value="${esc(p.title)}" required>
          </div>
          <div class="col-md-4">
            <label class="form-label">ID (латиница)</label>
            <input class="form-control" name="id" value="${esc(p.id)}" ${id ? "readonly" : ""} placeholder="bal_vampirov">
          </div>
          <div class="col-md-6">
            <label class="form-label">Дата и время</label>
            <input class="form-control" name="date" value="${esc(p.date)}" placeholder="15 ноября 2026, 19:00">
          </div>
          <div class="col-md-6">
            <label class="form-label">Тег</label>
            <input class="form-control" name="tag" value="${esc(p.tag)}">
          </div>
          <div class="col-md-4">
            <label class="form-label">Длительность</label>
            <input class="form-control" name="duration" value="${esc(p.duration)}" placeholder="2 ч 30 мин">
          </div>
          <div class="col-md-4">
            <label class="form-label">Стоимость от (₽)</label>
            <input class="form-control" name="priceFrom" type="number" min="0" step="1" value="${esc(p.priceFrom ?? "")}" placeholder="1500">
          </div>
          <div class="col-md-4">
            <label class="form-label">Стоимость до (₽)</label>
            <input class="form-control" name="priceTo" type="number" min="0" step="1" value="${esc(p.priceTo ?? "")}" placeholder="4000">
          </div>
          <div class="col-12">
            <label class="form-label">Описание *</label>
            <textarea class="form-control" name="description" rows="5" required>${esc(p.description)}</textarea>
          </div>
          <div class="col-12">
            <label class="form-label">Постер</label>
            <div class="input-group">
              <input class="form-control" name="poster" id="posterUrl" value="${esc(p.poster)}">
              <input type="file" class="form-control" id="posterFile" accept="image/*">
              <button type="button" class="btn btn-outline-secondary" id="uploadPoster">Загрузить</button>
            </div>
            ${p.poster ? `<img src="${esc(p.poster.startsWith("/") || p.poster.startsWith("http") ? p.poster : "/uploads/" + p.poster)}" class="mt-2 rounded" style="max-height:120px" alt="">` : ""}
          </div>
          <div class="col-12">
            <label class="form-label">Галерея (drag-and-drop для сортировки)</label>
            <ul class="gallery-sortable" id="galleryList"></ul>
            <input type="file" id="galleryFile" accept="image/*" multiple class="form-control mt-2">
          </div>
          <div class="col-12">
            <label class="form-label">Солисты</label>
            <div id="soloistsList"></div>
            <button type="button" class="btn btn-sm btn-outline-secondary mt-1" id="addSoloist">+ Солист</button>
          </div>
          <div class="col-12">
            <label class="form-label">Ссылка на билеты</label>
            <input class="form-control" name="ticketLink" type="url" value="${esc(p.ticketLink)}">
          </div>
        </div>
        <button type="submit" class="btn btn-gold mt-4">Сохранить спектакль</button>
      </div>
    </form>`;

  document.getElementById("backToList").onclick = () => { showView("projects"); renderProjectsList(); };

  const gallery = [...(p.gallery || [])];
  renderGallerySortable(gallery);
  renderSoloists(p.soloists || []);

  document.getElementById("uploadPoster").onclick = async () => {
    const f = document.getElementById("posterFile").files[0];
    if (!f) return toast("Выберите файл", "error");
    try {
      const r = await uploadFile(f);
      document.getElementById("posterUrl").value = r.url;
      toast("Постер загружен");
    } catch (e) { toast(e.message, "error"); }
  };

  document.getElementById("galleryFile").onchange = async (e) => {
    for (const f of e.target.files) {
      try {
        const r = await uploadFile(f);
        gallery.push(r.url);
      } catch (err) { toast(err.message, "error"); }
    }
    renderGallerySortable(gallery);
    e.target.value = "";
  };

  document.getElementById("addSoloist").onclick = () => {
    const list = document.getElementById("soloistsList");
    list.insertAdjacentHTML("beforeend", soloistRow({}));
    bindSoloistRow(list.lastElementChild);
  };

  document.getElementById("projectForm").onsubmit = async (e) => {
    e.preventDefault();
    await saveProject(gallery);
  };
}

// Привести солиста к объекту {name, role, photo} (поддержка старых строк "Имя — Роль")
function normalizeSoloist(s) {
  if (s && typeof s === "object") {
    return { name: s.name || "", role: s.role || "", photo: s.photo || "" };
  }
  const parts = String(s || "").split(/\s+[—–-]\s+/);
  return { name: (parts[0] || "").trim(), role: (parts[1] || "").trim(), photo: "" };
}

function mediaSrc(p) {
  if (!p) return "";
  return p.startsWith("/") || p.startsWith("http") ? p : "/uploads/" + p;
}

function soloistRow(s = {}) {
  const photo = s.photo || "";
  const src = mediaSrc(photo);
  return `
    <div class="soloist-row" data-soloist>
      <div class="soloist-photo-box">
        ${src
          ? `<img class="soloist-thumb" src="${esc(src)}" alt="">`
          : `<span class="soloist-thumb soloist-thumb--empty">нет фото</span>`}
        <input type="hidden" class="soloist-photo" value="${esc(photo)}">
        <input type="file" class="soloist-file" accept="image/*" hidden>
        <button type="button" class="btn btn-outline-secondary btn-sm soloist-upload">📷 Фото</button>
      </div>
      <input class="form-control soloist-name" placeholder="Имя" value="${esc(s.name || "")}">
      <input class="form-control soloist-role" placeholder="Роль" value="${esc(s.role || "")}">
      <button type="button" class="btn btn-outline-danger btn-sm rm-soloist">✕</button>
    </div>`;
}

function bindSoloistRow(row) {
  row.querySelector(".rm-soloist").onclick = () => row.remove();

  const fileInput = row.querySelector(".soloist-file");
  row.querySelector(".soloist-upload").onclick = () => fileInput.click();

  fileInput.onchange = async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try {
      const r = await uploadFile(f);
      row.querySelector(".soloist-photo").value = r.url;
      const box = row.querySelector(".soloist-photo-box");
      let img = box.querySelector("img.soloist-thumb");
      if (!img) {
        const empty = box.querySelector(".soloist-thumb--empty");
        if (empty) empty.remove();
        img = document.createElement("img");
        img.className = "soloist-thumb";
        box.prepend(img);
      }
      img.src = r.thumb || r.url;
      toast("Фото солиста загружено");
    } catch (e) {
      toast(e.message, "error");
    }
    fileInput.value = "";
  };
}

function renderSoloists(list) {
  const el = document.getElementById("soloistsList");
  el.innerHTML = list.map((s) => soloistRow(normalizeSoloist(s))).join("");
  el.querySelectorAll("[data-soloist]").forEach(bindSoloistRow);
}

function renderGallerySortable(urls) {
  const list = document.getElementById("galleryList");
  list.innerHTML = urls.map((url, i) => `
    <li draggable="true" data-i="${i}">
      <span class="text-muted">⠿</span>
      <img src="${url.startsWith("/") || url.startsWith("http") ? url : "/uploads/" + url}" alt="">
      <input class="form-control form-control-sm flex-grow-1" value="${esc(url)}" data-gallery-input="${i}">
      <button type="button" class="btn btn-sm btn-outline-danger" data-rm-gal="${i}">✕</button>
    </li>`).join("");

  list.querySelectorAll("[data-rm-gal]").forEach((b) => b.onclick = () => {
    urls.splice(Number(b.dataset.rmGal), 1);
    renderGallerySortable(urls);
  });

  list.querySelectorAll("[data-gallery-input]").forEach((inp) => {
    inp.onchange = () => { urls[Number(inp.dataset.galleryInput)] = inp.value; };
  });

  let dragIdx = null;
  list.querySelectorAll("li").forEach((li) => {
    li.ondragstart = () => { dragIdx = Number(li.dataset.i); li.classList.add("dragging"); };
    li.ondragend = () => li.classList.remove("dragging");
    li.ondragover = (e) => e.preventDefault();
    li.ondrop = (e) => {
      e.preventDefault();
      const dropIdx = Number(li.dataset.i);
      if (dragIdx === null || dragIdx === dropIdx) return;
      const [item] = urls.splice(dragIdx, 1);
      urls.splice(dropIdx, 0, item);
      renderGallerySortable(urls);
    };
  });
}

async function saveProject(gallery) {
  const f = document.getElementById("projectForm");
  const body = {
    title: f.title.value.trim(),
    date: f.date.value.trim(),
    tag: f.tag.value.trim(),
    description: f.description.value.trim(),
    poster: f.poster.value.trim() || document.getElementById("posterUrl").value,
    gallery: [...document.querySelectorAll("#galleryList [data-gallery-input]")].map((i) => i.value.trim()).filter(Boolean),
    soloists: [...document.querySelectorAll("#soloistsList [data-soloist]")].map((row) => ({
      name: row.querySelector(".soloist-name").value.trim(),
      role: row.querySelector(".soloist-role").value.trim(),
      photo: row.querySelector(".soloist-photo").value.trim()
    })).filter((s) => s.name || s.role),
    ticketLink: f.ticketLink.value.trim(),
    duration: f.duration.value.trim(),
    priceFrom: f.priceFrom.value.trim(),
    priceTo: f.priceTo.value.trim()
  };

  if (!body.title || !body.description) return toast("Заполните обязательные поля", "error");

  try {
    if (editingProjectId) {
      await api(`/api/projects/${editingProjectId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      body.id = f.id.value.trim() || undefined;
      await api("/api/projects", { method: "POST", body: JSON.stringify(body) });
    }
    db = await api("/api/content");
    toast("Успешно сохранено!");
    showView("projects");
    renderProjectsList();
  } catch (e) { toast(e.message, "error"); }
}

function deleteProject(id) {
  const p = db.projects.find((x) => x.id === id);
  confirmDialog(`Удалить спектакль «${p?.title}»?`, async () => {
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      db = await api("/api/content");
      toast("Спектакль удалён");
      renderProjectsList();
    } catch (e) { toast(e.message, "error"); }
  });
}

/* --- About --- */

function renderAbout() {
  document.getElementById("viewAbout").innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">О коллективе</h2>
    <form id="aboutForm" class="card bg-dark border-secondary"><div class="card-body">
      <label class="form-label">Текст</label>
      <textarea class="form-control mb-3" name="text" rows="6">${esc(db.about?.text)}</textarea>
      <label class="form-label">Фото галереи</label>
      <ul class="gallery-sortable" id="aboutGallery"></ul>
      <input type="file" id="aboutPhotos" accept="image/*" multiple class="form-control">
      <button type="submit" class="btn btn-gold mt-3">Сохранить</button>
    </div></form>`;

  const photos = [...(db.about?.photos || [])];
  const captions = [...(db.about?.captions || [])];
  renderAboutGallery(photos, captions);

  document.getElementById("aboutPhotos").onchange = async (e) => {
    for (const f of e.target.files) {
      const r = await uploadFile(f);
      photos.push(r.url);
      captions.push("Фото");
    }
    renderAboutGallery(photos, captions);
  };

  document.getElementById("aboutForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/about", {
        method: "PUT",
        body: JSON.stringify({
          text: e.target.text.value,
          photos,
          captions
        })
      });
      db = await api("/api/content");
      toast("Раздел «О нас» сохранён");
    } catch (err) { toast(err.message, "error"); }
  };
}

function renderAboutGallery(photos, captions) {
  const list = document.getElementById("aboutGallery");
  list.innerHTML = photos.map((url, i) => `
    <li draggable="true" data-i="${i}">
      <img src="${url.startsWith("/") || url.startsWith("http") ? url : "/uploads/" + url}" alt="">
      <input class="form-control form-control-sm" value="${esc(captions[i] || "")}" data-cap="${i}" placeholder="Подпись">
      <button type="button" class="btn btn-sm btn-outline-danger" data-rm="${i}">✕</button>
    </li>`).join("");

  list.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => {
    photos.splice(Number(b.dataset.rm), 1);
    captions.splice(Number(b.dataset.rm), 1);
    renderAboutGallery(photos, captions);
  });

  let dragIdx = null;
  list.querySelectorAll("li").forEach((li) => {
    li.ondragstart = () => { dragIdx = Number(li.dataset.i); };
    li.ondragover = (e) => e.preventDefault();
    li.ondrop = (e) => {
      e.preventDefault();
      const drop = Number(li.dataset.i);
      if (dragIdx === null || dragIdx === drop) return;
      [photos[dragIdx], photos[drop]] = [photos[drop], photos[dragIdx]];
      [captions[dragIdx], captions[drop]] = [captions[drop], captions[dragIdx]];
      renderAboutGallery(photos, captions);
    };
  });

  list.querySelectorAll("[data-cap]").forEach((inp) => {
    inp.onchange = () => { captions[Number(inp.dataset.cap)] = inp.value; };
  });
}

/* --- Director / Concertmaster --- */

function personForm(section, data, apiPath) {
  document.getElementById(`view${section}`).innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">${section === "Director" ? "Худрук" : "Концертмейстер"}</h2>
    <form id="personForm" class="card bg-dark border-secondary"><div class="card-body row g-3">
      <div class="col-md-6"><label class="form-label">Имя</label><input class="form-control" name="name" value="${esc(data.name)}"></div>
      <div class="col-md-6"><label class="form-label">Фото URL</label>
        <div class="input-group"><input class="form-control" name="photo" id="photoUrl" value="${esc(data.photo)}">
        <input type="file" id="photoFile" accept="image/*" class="form-control"><button type="button" class="btn btn-outline-secondary" id="uploadPhoto">↑</button></div></div>
      <div class="col-12"><label class="form-label">Биография</label><textarea class="form-control" name="bio" rows="4">${esc(data.bio)}</textarea></div>
      <div class="col-12"><label class="form-label">Достижения</label><textarea class="form-control" name="achievements" rows="2">${esc(data.achievements)}</textarea></div>
      <div class="col-12"><button type="submit" class="btn btn-gold">Сохранить</button></div>
    </div></form>`;

  document.getElementById("uploadPhoto").onclick = async () => {
    const f = document.getElementById("photoFile").files[0];
    if (!f) return;
    const r = await uploadFile(f);
    document.getElementById("photoUrl").value = r.url;
    toast("Фото загружено");
  };

  document.getElementById("personForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api(apiPath, {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(fd))
      });
      db = await api("/api/content");
      toast("Сохранено");
    } catch (err) { toast(err.message, "error"); }
  };
}

function renderDirector() { personForm("Director", db.artisticDirector || {}, "/api/director"); }
function renderConcertmaster() { personForm("Concertmaster", db.concertmaster || {}, "/api/concertmaster"); }

function renderChoir() {
  const c = db.choirInvite || {};
  document.getElementById("viewChoir").innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">Приглашение в хор</h2>
    <form id="choirForm" class="card bg-dark border-secondary"><div class="card-body">
      <textarea class="form-control mb-3" name="text" rows="5">${esc(c.text)}</textarea>
      <input class="form-control mb-3" name="link" type="url" value="${esc(c.link)}" placeholder="Ссылка Guitardo">
      <input class="form-control mb-3" name="background" value="${esc(c.background)}" placeholder="URL фона">
      <button type="submit" class="btn btn-gold">Сохранить</button>
    </div></form>`;
  document.getElementById("choirForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/api/choir", { method: "PUT", body: JSON.stringify(Object.fromEntries(fd)) });
      db = await api("/api/content");
      toast("Сохранено");
    } catch (err) { toast(err.message, "error"); }
  };
}

function renderContacts() {
  const c = db.contacts || {};
  const s = c.social || {};
  document.getElementById("viewContacts").innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">Контакты</h2>
    <form id="contactsForm" class="card bg-dark border-secondary"><div class="card-body row g-3">
      <div class="col-md-6"><label class="form-label">Email</label><input class="form-control" name="email" type="email" value="${esc(c.email)}"></div>
      <div class="col-md-6"><label class="form-label">Телефон</label><input class="form-control" name="phone" value="${esc(c.phone)}"></div>
      <div class="col-12"><label class="form-label">VK</label><input class="form-control" name="vk" value="${esc(s.vk)}"></div>
      <div class="col-12"><label class="form-label">Telegram</label><input class="form-control" name="telegram" value="${esc(s.telegram)}"></div>
      <div class="col-12"><label class="form-label">YouTube</label><input class="form-control" name="youtube" value="${esc(s.youtube)}"></div>
      <div class="col-12"><button type="submit" class="btn btn-gold">Сохранить</button></div>
    </div></form>`;

  document.getElementById("contactsForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/api/contacts", {
        method: "PUT",
        body: JSON.stringify({
          email: fd.get("email"),
          phone: fd.get("phone"),
          social: { vk: fd.get("vk"), telegram: fd.get("telegram"), youtube: fd.get("youtube") }
        })
      });
      db = await api("/api/content");
      toast("Контакты сохранены");
    } catch (err) { toast(err.message, "error"); }
  };
}

function parseLocCoords(str) {
  if (!str) return null;
  let parts = String(str).split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) parts = String(str).split(/\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function locationMapSrc(loc = {}) {
  if (loc.mapUrl) return loc.mapUrl;
  const c = parseLocCoords(loc.coords);
  if (c) return `https://yandex.ru/map-widget/v1/?ll=${c.lon},${c.lat}&z=17`;
  if (loc.address) return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(loc.address)}&z=16`;
  return "";
}

const ADMIN_MAP_PIN =
  '<span id="locMapPin" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);' +
  'pointer-events:none;z-index:3;line-height:0;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45))">' +
  '<svg viewBox="0 0 24 36" width="30" height="45" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#e10a17"/>' +
  '<circle cx="12" cy="12" r="4.5" fill="#fff"/></svg></span>';

function renderLocation() {
  const l = db.location || {};
  document.getElementById("viewLocation").innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">Как добраться</h2>
    <form id="locationForm" class="card bg-dark border-secondary"><div class="card-body row g-3">
      <div class="col-12">
        <label class="form-label">Заголовок секции</label>
        <input class="form-control" name="title" value="${esc(l.title || "Как добраться")}">
      </div>
      <div class="col-12">
        <label class="form-label">Адрес (отображается на сайте и ищется на карте)</label>
        <input class="form-control" name="address" id="locAddress" value="${esc(l.address)}" placeholder="Москва, Тверская улица, 1">
      </div>
      <div class="col-12">
        <label class="form-label">Координаты для красной метки (широта, долгота) — необязательно</label>
        <input class="form-control" name="coords" id="locCoords" value="${esc(l.coords)}" placeholder="55.770050, 37.679600">
        <small class="text-muted">На Яндекс.Картах: ПКМ по зданию → «Что здесь?» → скопировать координаты. Если заполнено — на здании будет красная метка.</small>
      </div>
      <div class="col-12">
        <label class="form-label">Как пройти (описание, необязательно)</label>
        <textarea class="form-control" name="note" rows="3">${esc(l.note)}</textarea>
      </div>
      <div class="col-12">
        <label class="form-label">Свой код карты (src из конструктора Яндекс.Карт, необязательно)</label>
        <input class="form-control" name="mapUrl" id="locMapUrl" value="${esc(l.mapUrl)}" placeholder="https://yandex.ru/map-widget/v1/...">
        <small class="text-muted">Если оставить пустым — карта построится автоматически по адресу.</small>
      </div>
      <div class="col-12">
        <label class="form-label">Предпросмотр карты</label>
        <div style="position:relative;height:300px;border:1px solid #444;border-radius:8px;overflow:hidden">
          <iframe id="locMapPreview" src="${esc(locationMapSrc(l))}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy" title="Предпросмотр карты"></iframe>
          ${ADMIN_MAP_PIN}
        </div>
      </div>
      <div class="col-12"><button type="submit" class="btn btn-gold">Сохранить</button></div>
    </div></form>`;

  const updatePreview = () => {
    const coords = document.getElementById("locCoords").value.trim();
    const mapUrl = document.getElementById("locMapUrl").value.trim();
    const src = locationMapSrc({
      address: document.getElementById("locAddress").value.trim(),
      coords,
      mapUrl
    });
    document.getElementById("locMapPreview").src = src;
    const pin = document.getElementById("locMapPin");
    if (pin) pin.style.display = !mapUrl && parseLocCoords(coords) ? "" : "none";
  };
  document.getElementById("locAddress").addEventListener("change", updatePreview);
  document.getElementById("locCoords").addEventListener("change", updatePreview);
  document.getElementById("locMapUrl").addEventListener("change", updatePreview);
  updatePreview();

  document.getElementById("locationForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/api/location", { method: "PUT", body: JSON.stringify(Object.fromEntries(fd)) });
      db = await api("/api/content");
      toast("Локация сохранена");
    } catch (err) { toast(err.message, "error"); }
  };
}

/* --- Hero / Главный экран --- */

function renderHeroSection() {
  const h = db.hero || {};
  const el = document.getElementById("viewHero");
  el.innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">Главный экран (Hero)</h2>

    <form id="heroForm" class="card bg-dark border-secondary mb-4"><div class="card-body row g-3">
      <div class="col-12">
        <label class="form-label">Подзаголовок-анонс (eyebrow)</label>
        <input class="form-control" name="eyebrow" value="${esc(h.eyebrow)}">
      </div>
      <div class="col-12">
        <label class="form-label">Заголовок (название спектакля)</label>
        <input class="form-control" name="title" value="${esc(h.title)}">
      </div>
      <div class="col-12">
        <label class="form-label">Подзаголовок</label>
        <input class="form-control" name="subtitle" value="${esc(h.subtitle)}">
      </div>
      <div class="col-12">
        <label class="form-label">Фоновое изображение</label>
        <div class="input-group">
          <input class="form-control" name="background" id="heroBgInput" value="${esc(h.background)}" placeholder="https://... или /uploads/файл.jpg">
          <label class="btn btn-outline-secondary">
            Загрузить
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" id="heroBgUpload" class="d-none">
          </label>
        </div>
        <div id="heroBgProgress" class="d-none mt-1">
          <div class="progress" style="height:6px"><div class="progress-bar progress-bar-striped progress-bar-animated bg-secondary" style="width:100%"></div></div>
          <div class="text-muted small mt-1">Загрузка изображения…</div>
        </div>
        <div id="heroBgPreview" class="mt-2" style="display:${h.background ? 'block' : 'none'}">
          <img src="${esc(h.background)}" alt="" style="max-height:120px;border-radius:6px;object-fit:cover;max-width:100%">
        </div>
      </div>

      <div class="col-12"><hr class="border-secondary"></div>

      <div class="col-12">
        <label class="form-label d-flex align-items-center gap-2">
          🎥 Фоновое видео (локальный файл)
          <span class="badge bg-warning text-dark">Новое</span>
        </label>
        <div class="input-group">
          <input class="form-control" name="videoFile" id="heroVideoFileInput" value="${esc(h.videoFile)}" placeholder="/uploads/videos/фон.mp4">
          <label class="btn btn-outline-warning">
            Загрузить
            <input type="file" accept="video/mp4,video/webm,.mp4,.webm,.mov,.mkv,.avi" id="heroVideoBgUpload" class="d-none">
          </label>
        </div>
        <div class="form-text">Если заполнено — заменяет фоновое изображение. Видео воспроизводится автоматически, без звука, в петле.</div>
        <div id="heroVideoBgProgress" class="d-none mt-1">
          <div class="progress" style="height:6px"><div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width:100%"></div></div>
          <div class="text-muted small mt-1">Загрузка фонового видео…</div>
        </div>
      </div>

      <div class="col-12">
        <label class="form-label">YouTube/Vimeo трейлер (embed URL)</label>
        <input class="form-control" name="videoTrailerUrl" value="${esc(h.videoTrailerUrl)}" placeholder="https://www.youtube.com/embed/ID_ВИДЕО">
        <div class="form-text">Кнопка ▶ откроет это видео в модальном окне.</div>
      </div>

      <div class="col-12">
        <label class="form-label d-flex align-items-center gap-2">
          🎞️ Трейлер — локальный видеофайл
          <span class="badge bg-warning text-dark">Новое</span>
        </label>
        <div class="input-group">
          <input class="form-control" name="trailerFile" id="heroTrailerFileInput" value="${esc(h.trailerFile)}" placeholder="/uploads/videos/трейлер.mp4">
          <label class="btn btn-outline-warning">
            Загрузить
            <input type="file" accept="video/mp4,video/webm,.mp4,.webm,.mov,.mkv,.avi" id="heroTrailerUpload" class="d-none">
          </label>
        </div>
        <div class="form-text">Если заполнено — имеет приоритет над YouTube. Воспроизводится по нажатию ▶.</div>
        <div id="heroTrailerProgress" class="d-none mt-1">
          <div class="progress" style="height:6px"><div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width:100%"></div></div>
          <div class="text-muted small mt-1">Загрузка трейлера…</div>
        </div>
      </div>

      <div class="col-12">
        <button type="submit" class="btn btn-gold">Сохранить</button>
      </div>
    </div></form>`;

  // Загрузка фонового изображения
  document.getElementById("heroBgUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const prog = document.getElementById("heroBgProgress");
    prog.classList.remove("d-none");
    try {
      const r = await uploadFile(file, "image");
      const input = document.getElementById("heroBgInput");
      input.value = r.url;
      // Обновить превью
      const preview = document.getElementById("heroBgPreview");
      preview.style.display = "block";
      preview.querySelector("img").src = r.url;
      toast("Изображение загружено");
    } catch (err) { toast(err.message, "error"); }
    prog.classList.add("d-none");
    e.target.value = "";
  });

  // Загрузка фонового видео
  document.getElementById("heroVideoBgUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const prog = document.getElementById("heroVideoBgProgress");
    prog.classList.remove("d-none");
    try {
      const r = await uploadFile(file, "video");
      document.getElementById("heroVideoFileInput").value = r.url;
      toast(`Видео загружено: ${r.url}`);
    } catch (err) { toast(err.message, "error"); }
    prog.classList.add("d-none");
    e.target.value = "";
  });

  // Загрузка трейлера
  document.getElementById("heroTrailerUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const prog = document.getElementById("heroTrailerProgress");
    prog.classList.remove("d-none");
    try {
      const r = await uploadFile(file, "video");
      document.getElementById("heroTrailerFileInput").value = r.url;
      toast(`Трейлер загружен: ${r.url}`);
    } catch (err) { toast(err.message, "error"); }
    prog.classList.add("d-none");
    e.target.value = "";
  });

  // Сохранение
  document.getElementById("heroForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      db.hero = await api("/api/hero", { method: "PUT", body: JSON.stringify(body) });
      toast("Главный экран сохранён");
    } catch (err) { toast(err.message, "error"); }
  };
}

function renderPassword() {
  document.getElementById("viewPassword").innerHTML = `
    <h2 class="mb-4" style="font-family:var(--font-heading)">Смена пароля</h2>
    <form id="passForm" class="card bg-dark border-secondary" style="max-width:480px"><div class="card-body">
      <input type="password" class="form-control mb-2" name="oldPassword" placeholder="Старый пароль" required>
      <input type="password" class="form-control mb-2" name="newPassword" placeholder="Новый пароль (мин. 5)" required minlength="5">
      <input type="password" class="form-control mb-3" name="confirm" placeholder="Подтверждение" required>
      <button type="submit" class="btn btn-gold">Изменить пароль</button>
    </div></form>`;

  document.getElementById("passForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          oldPassword: fd.get("oldPassword"),
          newPassword: fd.get("newPassword"),
          confirm: fd.get("confirm")
        })
      });
      toast("Пароль изменён");
      e.target.reset();
    } catch (err) { toast(err.message, "error"); }
  };
}

/* --- Медиатека --- */

async function uploadFile(file, type = "image") {
  const fd = new FormData();
  if (type === "video") {
    fd.append("video", file);
  } else {
    fd.append("image", file);
  }
  const endpoint = type === "video" ? "/api/upload/video" : "/api/upload";
  return api(endpoint, {
    method: "POST",
    body: fd,
    headers: {
      "X-Auth-Token": sessionStorage.getItem(AUTH.token),
      "X-CSRF-Token": sessionStorage.getItem(AUTH.csrf)
    }
  });
}

let mediaData = { images: [], videos: [] };

async function loadMedia() {
  try {
    mediaData = await api("/api/media");
  } catch (e) {
    mediaData = { images: [], videos: [] };
  }
}

function mediaCard(item) {
  const preview = item.type === "video"
    ? `<div class="media-card-preview media-card-video"><span class="media-play-icon">▶</span></div>`
    : `<img src="${item.thumb || item.url}" alt="" class="media-card-preview" loading="lazy">`;

  return `
    <div class="media-card" data-url="${item.url}" data-type="${item.type}" data-filename="${item.filename}">
      ${preview}
      <div class="media-card-info">
        <div class="media-card-name text-truncate small" title="${item.filename}">${item.filename}</div>
        <div class="text-muted" style="font-size:0.7rem">${item.size}</div>
        <div class="d-flex gap-1 mt-1">
          <button class="btn btn-outline-secondary btn-xs copy-url-btn" title="Скопировать URL">📋</button>
          <button class="btn btn-outline-danger btn-xs del-media-btn" title="Удалить">🗑</button>
        </div>
      </div>
    </div>`;
}

async function renderMedia() {
  const el = document.getElementById("viewMedia");
  el.innerHTML = `<h2 class="mb-4" style="font-family:var(--font-heading)">Медиатека</h2><div class="text-muted">Загрузка…</div>`;

  await loadMedia();

  el.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <h2 class="mb-0" style="font-family:var(--font-heading)">Медиатека</h2>
      <div class="d-flex gap-2">
        <label class="btn btn-gold btn-sm">
          📷 Загрузить фото
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" multiple id="uploadPhotoInput" class="d-none">
        </label>
        <label class="btn btn-outline-warning btn-sm">
          🎬 Загрузить видео
          <input type="file" accept="video/mp4,video/webm,.mp4,.webm,.mov,.mkv,.avi" id="uploadVideoInput" class="d-none">
        </label>
      </div>
    </div>

    <!-- Прогресс загрузки -->
    <div id="mediaUploadProgress" class="d-none mb-3">
      <div class="progress" style="height:8px">
        <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width:100%"></div>
      </div>
      <p class="text-muted small mt-1" id="mediaUploadLabel">Загрузка…</p>
    </div>

    <!-- Фото -->
    <h5 class="mb-3">Фотографии <span class="badge bg-secondary">${mediaData.images.length}</span></h5>
    <div id="mediaPhotosGrid" class="media-grid mb-5">
      ${mediaData.images.length
        ? mediaData.images.map(mediaCard).join("")
        : '<p class="text-muted">Нет загруженных фото</p>'}
    </div>

    <!-- Видео -->
    <h5 class="mb-3">Видеофайлы <span class="badge bg-secondary">${mediaData.videos.length}</span></h5>
    <div id="mediaVideosGrid" class="media-grid">
      ${mediaData.videos.length
        ? mediaData.videos.map(mediaCard).join("")
        : '<p class="text-muted">Нет загруженных видео</p>'}
    </div>

    <div class="mt-4 p-3 bg-dark rounded border border-secondary" style="font-size:0.82rem; color:#aaa">
      <strong>Как использовать URL:</strong><br>
      • Скопируйте URL кнопкой 📋 и вставьте в поле «Фоновое видео» или «Трейлер» раздела Hero.<br>
      • Для фото вставьте в поле постера, галереи или фото команды.<br>
      • Видеофайлы хранятся в <code>/uploads/videos/</code>, фото — в <code>/uploads/</code>.
    </div>`;

  // Загрузка фото (несколько файлов)
  document.getElementById("uploadPhotoInput").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const prog = document.getElementById("mediaUploadProgress");
    const label = document.getElementById("mediaUploadLabel");
    prog.classList.remove("d-none");
    let ok = 0, fail = 0;
    for (const file of files) {
      label.textContent = `Загружаю ${file.name}…`;
      try {
        await uploadFile(file, "image");
        ok++;
      } catch (err) {
        fail++;
        toast(`Ошибка: ${file.name} — ${err.message}`, "error");
      }
    }
    prog.classList.add("d-none");
    e.target.value = "";
    if (ok > 0) toast(`Загружено фото: ${ok}${fail ? `, ошибок: ${fail}` : ""}`);
    await renderMedia();
  });

  // Загрузка видео (один файл)
  document.getElementById("uploadVideoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const prog = document.getElementById("mediaUploadProgress");
    const label = document.getElementById("mediaUploadLabel");
    prog.classList.remove("d-none");
    label.textContent = `Загружаю видео ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} МБ)…`;
    try {
      const result = await uploadFile(file, "video");
      toast(`Видео загружено: ${result.url}`);
    } catch (err) {
      toast(`Ошибка загрузки видео: ${err.message}`, "error");
    }
    prog.classList.add("d-none");
    e.target.value = "";
    await renderMedia();
  });

  // Делегирование кликов по карточкам
  el.addEventListener("click", async (e) => {
    const card = e.target.closest(".media-card");
    if (!card) return;

    if (e.target.closest(".copy-url-btn")) {
      await navigator.clipboard.writeText(card.dataset.url).catch(() => {});
      toast("URL скопирован");
      return;
    }

    if (e.target.closest(".del-media-btn")) {
      const filename = card.dataset.filename;
      const type = card.dataset.type;
      confirmDialog(`Удалить файл «${filename}»? Это действие нельзя отменить.`, async () => {
        try {
          await api(`/api/media/${type}/${encodeURIComponent(filename)}`, {
            method: "DELETE"
          });
          toast("Файл удалён");
          await renderMedia();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    }
  });
}

/* --- Init --- */

async function initApp() {
  db = await api("/api/content");
  renderDashboard();
}

(async () => {
  if (sessionStorage.getItem(AUTH.token) && (await checkAuth())) {
    showApp(true);
    await initApp();
  }
})();
