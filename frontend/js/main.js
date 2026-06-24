/**
 * ==========================================================================
 * ПУБЛИЧНЫЙ ФРОНТЕНД
 * ==========================================================================
 * Данные загружаются с REST API (backend/data/db.json).
 * При расширении: добавьте поле в db.json и соответствующий рендер здесь.
 * ==========================================================================
 */

let db = null;
let aboutCarousel = null;
let modalCarousel = null;

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

function imgUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/uploads/${path.replace(/^uploads\//, "")}`;
}

function formatPrice(from, to) {
  const f = from !== "" && from != null ? Number(from) : NaN;
  const t = to !== "" && to != null ? Number(to) : NaN;
  const hasF = Number.isFinite(f);
  const hasT = Number.isFinite(t);
  if (!hasF && !hasT) return "";
  const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
  if (hasF && hasT) return f === t ? rub(f) : `${rub(f)} – ${rub(t)}`;
  if (hasF) return `от ${rub(f)}`;
  return `до ${rub(t)}`;
}

function projectCardMetaLine(p = {}) {
  return [p.duration, formatPrice(p.priceFrom, p.priceTo)].filter(Boolean).join(" · ");
}

async function loadData() {
  const res = await fetch("/api/content");
  if (!res.ok) throw new Error("API недоступен");
  return res.json();
}

function applySeo(seo) {
  if (!seo) return;
  if (seo.title) document.title = seo.title;
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.content = val; };
  setMeta('meta[name="description"]', seo.description);
  setMeta('meta[name="keywords"]', seo.keywords);
  setMeta('meta[property="og:title"]', seo.title);
  setMeta('meta[property="og:description"]', seo.description);
  setMeta('meta[property="og:url"]', seo.ogUrl);
  setMeta('meta[property="og:image"]', seo.ogImage);
}

function initHero() {
  const h = db.hero;
  document.querySelector(".hero-eyebrow").textContent = h.eyebrow || "";
  document.getElementById("heroTitle").textContent = h.title || "";
  document.getElementById("heroSubtitle").textContent = h.subtitle || "";
  window.__videoTrailerUrl = h.videoTrailerUrl || "";

  const pic = document.querySelector("#heroVideoPlaceholder picture");
  if (pic && h.background) {
    pic.innerHTML = `<img src="${esc(imgUrl(h.background))}" alt="" class="hero-bg-img">`;
  }
}

function initAbout() {
  document.getElementById("aboutText").textContent = db.about.text || "";
  aboutCarousel?.destroy();

  const urls = (db.about.photos || []).map(imgUrl);
  const captions = db.about.captions || [];
  aboutCarousel = new Carousel(document.getElementById("aboutCarouselWrap"), urls, {
    autoplay: true,
    interval: 4000,
    pauseOnHover: true,
    captions
  });
  aboutCarousel.init();
  document.getElementById("aboutCarouselWrap").classList.add("about-carousel");
}

function initTeam() {
  const grid = document.getElementById("teamGrid");
  const members = [
    { ...db.artisticDirector, role: "Художественный руководитель" },
    { ...db.concertmaster, role: "Концертмейстер" }
  ];

  grid.innerHTML = members.map((m) => `
    <article class="team-card glass-card reveal">
      <div class="team-photo"><img src="${esc(imgUrl(m.photo))}" alt="${esc(m.name)}" loading="lazy"></div>
      <div class="team-info">
        <h3>${esc(m.name)}</h3>
        <p class="team-role">${esc(m.role)}</p>
        <p class="team-bio">${esc(m.bio)}</p>
        <div class="team-awards"><strong>Регалии и достижения</strong>${esc(m.achievements || "")}</div>
      </div>
    </article>`).join("");
}

function renderProjectCard(p) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "project-card glass-card reveal";
  card.setAttribute("role", "listitem");
  card.setAttribute("aria-label", `Подробнее о спектакле «${p.title}»`);
  card.innerHTML = `
    <div class="project-poster">
      <img src="${esc(imgUrl(p.poster))}" alt="Постер: ${esc(p.title)}" loading="lazy">
      <span class="project-tag">${esc(p.tag)}</span>
    </div>
    <div class="project-info">
      <h3>${esc(p.title)}</h3>
      <p class="project-date">${esc(p.date)}</p>
      ${projectCardMetaLine(p) ? `<p class="project-meta">${esc(projectCardMetaLine(p))}</p>` : ""}
      <p class="project-hint">Нажмите для подробностей →</p>
    </div>`;
  card.addEventListener("click", () => openProjectModal(p.id));
  return card;
}

function initProjects() {
  const grid = document.getElementById("projectsGrid");
  grid.innerHTML = "";
  (db.projects || []).forEach((p) => grid.appendChild(renderProjectCard(p)));
  initCurrentProject();
}

function initCurrentProject() {
  const p = db.projects?.[0];
  const el = document.getElementById("currentProjectHighlight");
  if (!p || !el) return;

  el.innerHTML = `
    <div class="project-highlight-poster">
      <img src="${esc(imgUrl(p.poster))}" alt="${esc(p.title)}">
    </div>
    <div>
      <h3>${esc(p.title)}</h3>
      <p class="project-date">${esc(p.date)} · ${esc(p.tag)}</p>
      ${projectCardMetaLine(p) ? `<p class="project-meta">${esc(projectCardMetaLine(p))}</p>` : ""}
      <p>${esc(p.description)}</p>
      <div class="modal-gallery" id="highlightCarousel" aria-label="Галерея текущего проекта"></div>
      <a href="${esc(p.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Купить билеты</a>
    </div>`;

  const urls = (p.gallery || []).map(imgUrl);
  if (urls.length) {
    const c = new Carousel(document.getElementById("highlightCarousel"), urls, {
      autoplay: true, interval: 4000, pauseOnHover: true
    });
    c.init();
  }
}

function openProjectModal(id) {
  const p = db.projects.find((x) => x.id === id);
  const modal = document.getElementById("projectModal");
  const body = document.getElementById("modalBody");
  if (!p || !modal || !body) return;

  modalCarousel?.destroy();

  body.innerHTML = `
    <img class="modal-poster" src="${esc(imgUrl(p.poster))}" alt="Постер: ${esc(p.title)}">
    <h2 id="modalTitle">${esc(p.title)}</h2>
    <p class="modal-meta">${esc(p.date)} · ${esc(p.tag)}</p>
    ${projectCardMetaLine(p) ? `<p class="modal-extra">${esc(projectCardMetaLine(p))}</p>` : ""}
    <p class="modal-description">${esc(p.description)}</p>
    <div class="modal-gallery" id="modalCarousel" aria-label="Фотографии со сцены"></div>
    <div class="modal-soloists">
      <h4>Солисты</h4>
      <ul>${(p.soloists || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    </div>
    <a href="${esc(p.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Купить билеты</a>`;

  const urls = (p.gallery || []).map(imgUrl);
  if (urls.length) {
    modalCarousel = new Carousel(document.getElementById("modalCarousel"), urls, {
      autoplay: true, interval: 4000, pauseOnHover: true
    });
    modalCarousel.init();
  }

  modal.showModal();
  document.body.style.overflow = "hidden";
}

function closeProjectModal() {
  modalCarousel?.destroy();
  modalCarousel = null;
  const modal = document.getElementById("projectModal");
  if (modal?.open) { modal.close(); document.body.style.overflow = ""; }
}

function initRecruitment() {
  const c = db.choirInvite;
  document.getElementById("recruitmentText").textContent = c.text || "";
  document.getElementById("recruitmentBtn").href = c.link || "#";
  const bg = document.querySelector(".recruitment-bg img");
  if (bg && c.background) bg.src = imgUrl(c.background);
}

function initContacts() {
  const c = db.contacts;
  document.getElementById("contactEmail").href = `mailto:${c.email}`;
  document.getElementById("contactEmail").textContent = c.email;
  document.getElementById("contactPhone").href = `tel:${c.phone?.replace(/\D/g, "")}`;
  document.getElementById("contactPhone").textContent = c.phone;
  document.getElementById("copyrightYear").textContent = new Date().getFullYear();

  if (db.brand) {
    document.querySelectorAll(".logo-text, .footer-logo").forEach((el) => { el.textContent = db.brand.name; });
    const t = document.querySelector(".footer-tagline");
    if (t) t.textContent = db.brand.tagline;
  }

  const icons = {
    vk: { label: "ВКонтакте", svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2z"/></svg>' },
    telegram: { label: "Telegram", svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>' },
    youtube: { label: "YouTube", svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.3 31.3 0 000 12a31.3 31.3 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.3 31.3 0 0024 12a31.3 31.3 0 00-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>' }
  };

  const wrap = document.getElementById("socialLinks");
  wrap.innerHTML = "";
  Object.entries(c.social || {}).forEach(([key, url]) => {
    if (!url || !icons[key]) return;
    const a = document.createElement("a");
    a.href = url;
    a.className = "social-link";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", icons[key].label);
    a.innerHTML = icons[key].svg;
    wrap.appendChild(a);
  });
}

/* UX */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: "smooth" });
      closeMobileNav();
    });
  });
}

function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

function initBurger() {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("mainNav");
  burger?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-active", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMobileNav));
}

function closeMobileNav() {
  document.getElementById("mainNav")?.classList.remove("is-open");
  const b = document.getElementById("burger");
  b?.classList.remove("is-active");
  b?.setAttribute("aria-expanded", "false");
  if (!document.getElementById("projectModal")?.open) document.body.style.overflow = "";
}

function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  const header = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    btn?.classList.toggle("is-visible", window.scrollY > 300);
    header?.classList.toggle("is-scrolled", window.scrollY > 50);
  }, { passive: true });
  btn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function initModals() {
  document.getElementById("modalClose")?.addEventListener("click", closeProjectModal);
  const pm = document.getElementById("projectModal");
  pm?.addEventListener("cancel", (e) => { e.preventDefault(); closeProjectModal(); });
  pm?.addEventListener("click", (e) => {
    const r = pm.querySelector(".modal-inner")?.getBoundingClientRect();
    if (r && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) closeProjectModal();
  });

  const vm = document.getElementById("videoModal");
  document.getElementById("heroPlayBtn")?.addEventListener("click", () => {
    const url = window.__videoTrailerUrl;
    if (!url || !vm) return;
    document.getElementById("videoEmbed").innerHTML = `<iframe src="${url}?autoplay=1" title="Трейлер" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    vm.showModal();
    document.body.style.overflow = "hidden";
  });
  const closeV = () => {
    document.getElementById("videoEmbed").innerHTML = "";
    vm?.close();
    if (!pm?.open) document.body.style.overflow = "";
  };
  document.getElementById("videoModalClose")?.addEventListener("click", closeV);
  vm?.addEventListener("click", (e) => { if (e.target === vm) closeV(); });
  vm?.addEventListener("cancel", (e) => { e.preventDefault(); closeV(); });
}

function renderAll() {
  applySeo(db.seo);
  initHero();
  initAbout();
  initTeam();
  initProjects();
  initRecruitment();
  initContacts();
  initScrollReveal();
}

document.addEventListener("DOMContentLoaded", async () => {
  initSmoothScroll();
  initBurger();
  initScrollTop();
  initModals();
  try {
    db = await loadData();
    renderAll();
  } catch {
    document.body.insertAdjacentHTML("afterbegin",
      '<div style="background:#8B0000;color:#fff;padding:1rem;text-align:center">Запустите сервер: <code>npm start</code></div>');
  }
});
