/**
 * ==========================================================================
 * ФРОНТЕНД — загрузка с API + карусели
 * ==========================================================================
 * Данные берутся из GET /api/content (файл data/site.json на сервере).
 * Без сервера — используется встроенный FALLBACK_DATA.
 * Редактировать контент удобнее через админку: /admin.html
 * ==========================================================================
 */

let siteData = null;
let aboutCarousel = null;
let modalCarousel = null;

/* --- Вспомогательные функции --- */

function createPicture(webp, src, alt) {
  const picture = document.createElement("picture");
  if (webp) {
    const source = document.createElement("source");
    source.srcset = webp;
    source.type = "image/webp";
    picture.appendChild(source);
  }
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt || "";
  img.loading = "lazy";
  picture.appendChild(img);
  return picture;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadSiteData() {
  try {
    const res = await fetch("/api/content");
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch {
    console.warn("API недоступен — загружаем резервные данные. Запустите: npm start");
    const res = await fetch("data/site.json");
    if (res.ok) return await res.json();
    throw new Error("Нет данных");
  }
}

/* --- Рендер блоков --- */

function applySeo(seo) {
  if (!seo) return;
  document.title = seo.title || document.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && seo.description) desc.content = seo.description;
  const kw = document.querySelector('meta[name="keywords"]');
  if (kw && seo.keywords) kw.content = seo.keywords;
}

function initHero() {
  const { hero, videoTrailerUrl } = siteData;
  document.querySelector(".hero-eyebrow").textContent = hero.eyebrow;
  document.getElementById("heroTitle").textContent = hero.title;
  document.getElementById("heroSubtitle").textContent = hero.subtitle;

  const placeholder = document.getElementById("heroVideoPlaceholder");
  if (placeholder && hero.backgroundImage) {
    const picture = placeholder.querySelector("picture");
    if (picture) {
      picture.innerHTML = "";
      if (hero.backgroundWebp) {
        const s = document.createElement("source");
        s.srcset = hero.backgroundWebp;
        s.type = "image/webp";
        picture.appendChild(s);
      }
      const img = document.createElement("img");
      img.src = hero.backgroundImage;
      img.alt = "";
      img.className = "hero-bg-img";
      picture.appendChild(img);
    }
  }

  window.__videoTrailerUrl = videoTrailerUrl;
}

function initAbout() {
  document.getElementById("aboutText").textContent = siteData.about;

  const wrap = document.getElementById("aboutCarouselWrap");
  if (!wrap) return;

  aboutCarousel?.destroy();
  const slides = siteData.gallery.map((g) => ({
    src: g.src,
    webp: g.webp,
    alt: g.alt,
    caption: g.caption
  }));

  aboutCarousel = new Carousel(wrap, slides, { showCaptions: true });
  aboutCarousel.init();
  wrap.classList.add("about-carousel");
}

function initTeam() {
  const grid = document.getElementById("teamGrid");
  grid.innerHTML = "";

  siteData.team.forEach((member) => {
    const card = document.createElement("article");
    card.className = "team-card glass-card reveal";
    card.innerHTML = `
      <div class="team-photo"></div>
      <div class="team-info">
        <h3>${escapeHtml(member.name)}</h3>
        <p class="team-role">${escapeHtml(member.role)}</p>
        <p class="team-bio">${escapeHtml(member.bio)}</p>
        <div class="team-awards">
          <strong>Регалии и достижения</strong>
          ${escapeHtml(member.awards)}
        </div>
      </div>`;
    card.querySelector(".team-photo").appendChild(
      createPicture(member.photoWebp, member.photo, member.name)
    );
    grid.appendChild(card);
  });
}

function renderProjectCard(project) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "project-card glass-card reveal";
  card.setAttribute("role", "listitem");
  card.setAttribute("aria-label", `Подробнее о спектакле «${project.title}»`);

  card.innerHTML = `
    <div class="project-poster"><span class="project-tag">${escapeHtml(project.tag)}</span></div>
    <div class="project-info">
      <h3>${escapeHtml(project.title)}</h3>
      <p class="project-date">${escapeHtml(project.date)}</p>
      <p class="project-hint">Нажмите для подробностей →</p>
    </div>`;

  card.querySelector(".project-poster").appendChild(
    createPicture(project.posterWebp, project.poster, project.title)
  );
  card.addEventListener("click", () => openProjectModal(project.id));
  return card;
}

function initProjects() {
  const grid = document.getElementById("projectsGrid");
  grid.innerHTML = "";
  siteData.projects.forEach((p) => grid.appendChild(renderProjectCard(p)));
  initCurrentProjectHighlight();
}

function initCurrentProjectHighlight() {
  const container = document.getElementById("currentProjectHighlight");
  const project = siteData.projects[0];
  if (!container || !project) return;

  container.innerHTML = `
    <div class="project-highlight-poster"></div>
    <div>
      <h3>${escapeHtml(project.title)}</h3>
      <p class="project-date">${escapeHtml(project.date)} · ${escapeHtml(project.tag)}</p>
      <p>${escapeHtml(project.description)}</p>
      <a href="${escapeHtml(project.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Купить билеты</a>
    </div>`;
  container.querySelector(".project-highlight-poster").appendChild(
    createPicture(project.posterWebp, project.poster, project.title)
  );
}

function openProjectModal(projectId) {
  const project = siteData.projects.find((p) => p.id === projectId);
  const modal = document.getElementById("projectModal");
  const body = document.getElementById("modalBody");
  if (!project || !modal || !body) return;

  modalCarousel?.destroy();
  modalCarousel = null;

  const soloistsHtml = project.soloists.map((s) => `<li>${escapeHtml(s)}</li>`).join("");

  body.innerHTML = `
    <picture>
      ${project.posterWebp ? `<source srcset="${project.posterWebp}" type="image/webp">` : ""}
      <img class="modal-poster" src="${escapeHtml(project.poster)}" alt="Постер: ${escapeHtml(project.title)}">
    </picture>
    <h2 id="modalTitle">${escapeHtml(project.title)}</h2>
    <p class="modal-meta">${escapeHtml(project.date)} · ${escapeHtml(project.tag)}</p>
    <p class="modal-description">${escapeHtml(project.description)}</p>
    <div class="modal-gallery" id="modalCarousel" aria-label="Фотографии со сцены"></div>
    <div class="modal-soloists">
      <h4>Солисты</h4>
      <ul>${soloistsHtml}</ul>
    </div>
    <a href="${escapeHtml(project.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Купить билеты</a>`;

  const carouselEl = document.getElementById("modalCarousel");
  if (carouselEl && project.gallery?.length) {
    modalCarousel = new Carousel(
      carouselEl,
      project.gallery.map((g) => ({ src: g.src, webp: g.webp, alt: g.alt })),
      { showCaptions: false }
    );
    modalCarousel.init();
  }

  modal.showModal();
  document.body.style.overflow = "hidden";
}

function closeProjectModal() {
  const modal = document.getElementById("projectModal");
  modalCarousel?.destroy();
  modalCarousel = null;
  if (modal?.open) {
    modal.close();
    document.body.style.overflow = "";
  }
}

function initContacts() {
  const { contacts, recruitment, recruitmentLink, brand } = siteData;

  document.getElementById("contactEmail").href = `mailto:${contacts.email}`;
  document.getElementById("contactEmail").textContent = contacts.email;
  document.getElementById("contactPhone").href = `tel:${contacts.phone}`;
  document.getElementById("contactPhone").textContent = contacts.phoneDisplay;
  document.getElementById("recruitmentText").textContent = recruitment;
  document.getElementById("recruitmentBtn").href = recruitmentLink;
  document.getElementById("copyrightYear").textContent = new Date().getFullYear();

  if (brand) {
    document.querySelectorAll(".logo-text, .footer-logo").forEach((el) => {
      el.textContent = brand.name;
    });
    const tagline = document.querySelector(".footer-tagline");
    if (tagline) tagline.textContent = brand.tagline;
  }

  const recBg = document.querySelector(".recruitment-bg picture");
  if (recBg && siteData.recruitmentBg) {
    recBg.innerHTML = "";
    if (siteData.recruitmentBgWebp) {
      const s = document.createElement("source");
      s.srcset = siteData.recruitmentBgWebp;
      s.type = "image/webp";
      recBg.appendChild(s);
    }
    const img = document.createElement("img");
    img.src = siteData.recruitmentBg;
    img.alt = "";
    recBg.appendChild(img);
  }
}

function initSocialLinks() {
  const container = document.getElementById("socialLinks");
  const icons = {
    vk: { label: "ВКонтакте", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.08 14.27h-1.46c-.55 0-.72-.44-1.71-1.42-.86-.82-1.24-.93-1.45-.93-.3 0-.38.09-.38.5v1.3c0 .36-.12.58-1.08.58-1.59 0-3.36-.96-4.6-2.75-1.87-2.58-2.38-4.52-2.38-4.65 0-.2.09-.39.5-.39h1.46c.37 0 .51.17.65.57.7 2.05 1.88 3.85 2.36 3.85.18 0 .27-.09.27-.55V9.58c-.06-.99-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.3c.31 0 .42.17.42.54v2.89c0 .31.14.42.23.42.18 0 .33-.11.65-.43 1.01-1.13 1.73-2.87 1.73-2.87.1-.2.26-.39.63-.39h1.46c.44 0 .53.23.44.54-.18.86-1.93 3.26-1.93 3.26-.15.25-.21.36 0 .65.15.21.66.64 1 1.04.62.74 1.1 1.36 1.23 1.79.14.44-.08.66-.52.66z"/></svg>` },
    telegram: { label: "Telegram", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>` },
    youtube: { label: "YouTube", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.3 31.3 0 000 12a31.3 31.3 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.3 31.3 0 0024 12a31.3 31.3 0 00-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>` }
  };

  container.innerHTML = "";
  Object.entries(siteData.socialLinks).forEach(([key, url]) => {
    if (!icons[key] || !url) return;
    const link = document.createElement("a");
    link.href = url;
    link.className = "social-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", icons[key].label);
    link.innerHTML = icons[key].svg;
    container.appendChild(link);
  });
}

/* --- Интерактивность (без изменений) --- */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileNav();
    });
  });
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

function initBurgerMenu() {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("mainNav");
  if (!burger || !nav) return;

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-active", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMobileNav));
}

function closeMobileNav() {
  document.getElementById("mainNav")?.classList.remove("is-open");
  const burger = document.getElementById("burger");
  burger?.classList.remove("is-active");
  burger?.setAttribute("aria-expanded", "false");
  if (!document.getElementById("projectModal")?.open) {
    document.body.style.overflow = "";
  }
}

function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  const header = document.querySelector(".site-header");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("is-visible", window.scrollY > 300);
    header?.classList.toggle("is-scrolled", window.scrollY > 50);
  }, { passive: true });

  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function initModals() {
  document.getElementById("modalClose")?.addEventListener("click", closeProjectModal);

  const projectModal = document.getElementById("projectModal");
  projectModal?.addEventListener("click", (e) => {
    const rect = projectModal.querySelector(".modal-inner")?.getBoundingClientRect();
    if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
      closeProjectModal();
    }
  });
  projectModal?.addEventListener("cancel", (e) => { e.preventDefault(); closeProjectModal(); });

  const videoModal = document.getElementById("videoModal");
  document.getElementById("heroPlayBtn")?.addEventListener("click", () => {
    const embed = document.getElementById("videoEmbed");
    const url = window.__videoTrailerUrl || "";
    if (!embed || !videoModal || !url) return;
    embed.innerHTML = `<iframe src="${url}?autoplay=1" title="Трейлер" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    videoModal.showModal();
    document.body.style.overflow = "hidden";
  });

  function closeVideo() {
    document.getElementById("videoEmbed").innerHTML = "";
    videoModal?.close();
    if (!projectModal?.open) document.body.style.overflow = "";
  }
  document.getElementById("videoModalClose")?.addEventListener("click", closeVideo);
  videoModal?.addEventListener("click", (e) => { if (e.target === videoModal) closeVideo(); });
  videoModal?.addEventListener("cancel", (e) => { e.preventDefault(); closeVideo(); });
}

function renderSite() {
  applySeo(siteData.seo);
  initHero();
  initAbout();
  initTeam();
  initProjects();
  initContacts();
  initSocialLinks();
  initScrollReveal();
}

/* --- Запуск --- */

document.addEventListener("DOMContentLoaded", async () => {
  initSmoothScroll();
  initBurgerMenu();
  initScrollTop();
  initModals();

  try {
    siteData = await loadSiteData();
    renderSite();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML("afterbegin",
      '<div style="background:#8B0000;color:#fff;padding:1rem;text-align:center">Не удалось загрузить данные. Запустите сервер: npm start</div>'
    );
  }
});
