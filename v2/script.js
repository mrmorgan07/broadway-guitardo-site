/* ==========================================================================
   BROADWAY GUITARDO — v2 (новый дизайн + живые данные из /api/content)
   Оригинальное приложение на "/" не затрагивается.
   ========================================================================== */

/* --- Утилиты --- */
const $ = (sel, root = document) => root.querySelector(sel);

function imgUrl(p) {
  if (!p) return "";
  if (p.startsWith("http") || p.startsWith("/")) return p;
  return `/uploads/${p.replace(/^uploads\//, "")}`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function projectCardMeta(p = {}) {
  const parts = [];
  if (p.duration) parts.push(esc(p.duration));
  const price = formatPrice(p.priceFrom, p.priceTo);
  if (price) parts.push(esc(price));
  return parts.length ? `<p class="poster-card__details">${parts.join(" · ")}</p>` : "";
}

// Разбить заголовок: последнее слово — золотой акцент
function splitTitle(title) {
  const t = (title || "").trim();
  const parts = t.split(" ");
  if (parts.length < 2) return `<span class="accent">${esc(t)}</span>`;
  const last = parts.pop();
  return `${esc(parts.join(" "))} <span class="accent">${esc(last)}</span>`;
}

function videoType(url) {
  if (url.endsWith(".webm")) return "video/webm";
  if (url.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

/* --- Состояние --- */
let DB = null;

/* ==========================================================================
   РЕНДЕР СЕКЦИЙ
   ========================================================================== */

function renderHero(hero = {}) {
  const bgVideo = hero.videoFile ? imgUrl(hero.videoFile) : null;
  const bg = bgVideo
    ? `<video class="hero__media" autoplay muted loop playsinline>
         <source src="${esc(bgVideo)}" type="${videoType(bgVideo)}">
       </video>`
    : `<div class="hero__bg" style="background-image:url('${esc(imgUrl(hero.background))}')"></div>`;

  const hasTrailer = !!(hero.trailerFile || hero.videoTrailerUrl);

  return `
    <section class="hero" id="hero">
      ${bg}
      <div class="hero__overlay"></div>
      <div class="hero__content">
        <p class="hero__eyebrow">${esc(hero.eyebrow)}</p>
        <h1 class="hero__title">${splitTitle(hero.title)}</h1>
        <div class="hero__line"></div>
        <p class="hero__subtitle">${esc(hero.subtitle)}</p>
        <div class="hero__actions">
          <a href="#afisha" class="btn btn-primary">Купить билеты</a>
          ${hasTrailer ? `<button class="btn btn-secondary" data-open-trailer>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Смотреть трейлер
          </button>` : ""}
        </div>
      </div>
      <div class="hero__scroll">Листайте вниз</div>
    </section>`;
}

function renderAbout(about = {}) {
  const photos = about.photos || [];
  const captions = about.captions || [];
  const slides = photos.map((src, i) => `
    <div class="carousel__slide">
      <img src="${esc(imgUrl(src))}" alt="${esc(captions[i] || "Фото")}" loading="lazy">
      ${captions[i] ? `<div class="carousel__caption">${esc(captions[i])}</div>` : ""}
    </div>`).join("");

  return `
    <section class="section section--light" id="about">
      <div class="container about__grid">
        <div class="about__text reveal">
          <p class="section-eyebrow">О коллективе</p>
          <h2 class="section-title">Где музыка становится театром</h2>
          <hr class="gold-divider">
          <p>${esc(about.text)}</p>
          <a href="#leaders" class="btn btn-secondary" style="margin-top:16px;">Узнать больше</a>
        </div>
        <div class="reveal delay-1">
          <div class="carousel" data-carousel>
            <div class="carousel__track">${slides}</div>
            ${photos.length > 1 ? `
              <button class="carousel__arrow prev" aria-label="Назад">‹</button>
              <button class="carousel__arrow next" aria-label="Вперёд">›</button>
              <div class="carousel__dots"></div>` : ""}
          </div>
        </div>
      </div>
    </section>`;
}

function leaderCard(person = {}, role, delay) {
  const tags = (person.achievements || "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join("");

  return `
    <div class="leader-card reveal ${delay}">
      <img class="leader-card__photo" src="${esc(imgUrl(person.photo))}" alt="${esc(person.name)}">
      <div style="text-align:left">
        <h3 class="leader-card__name">${esc(person.name)}</h3>
        <p class="leader-card__role">${esc(role)}</p>
        <p class="leader-card__desc">${esc(person.bio)}</p>
        ${tags ? `<div class="leader-card__tags">${tags}</div>` : ""}
      </div>
    </div>`;
}

function renderLeaders(db) {
  return `
    <section class="section section--center" id="leaders">
      <div class="container">
        <p class="section-eyebrow">Лица коллектива</p>
        <h2 class="section-title">Руководство</h2>
        <hr class="gold-divider">
        <div class="leaders__grid">
          ${leaderCard(db.artisticDirector, "Художественный руководитель", "")}
          ${leaderCard(db.concertmaster, "Концертмейстер", "delay-1")}
        </div>
      </div>
    </section>`;
}

function renderAfisha(projects = []) {
  const cards = projects.map((p, i) => `
    <a class="poster-card reveal ${["", "delay-1", "delay-2"][i % 3]}" data-project="${esc(p.id)}">
      <img src="${esc(imgUrl(p.poster))}" alt="${esc(p.title)}" loading="lazy">
      <div class="poster-card__overlay">
        <h3 class="poster-card__title">${esc(p.title)}</h3>
        <p class="poster-card__meta">${esc(p.date)}${p.tag ? " · " + esc(p.tag) : ""}</p>
        ${projectCardMeta(p)}
        <p class="poster-card__extra">Нажмите, чтобы узнать подробности →</p>
      </div>
    </a>`).join("");

  return `
    <section class="section section--center" id="afisha" style="background:var(--bg-anthracite)">
      <div class="container">
        <p class="section-eyebrow">Ближайшие показы</p>
        <h2 class="section-title">Афиша</h2>
        <hr class="gold-divider">
        <div class="poster-grid">${cards}</div>
      </div>
    </section>`;
}

function renderInvite(invite = {}) {
  return `
    <section class="section invite" id="invite">
      <div class="invite__bg" style="background-image:url('${esc(imgUrl(invite.background))}')"></div>
      <div class="container invite__content reveal">
        <div class="invite__icons">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <p class="section-eyebrow" style="color:var(--gold)">Присоединяйтесь</p>
        <h2 class="section-title">Стань частью магии</h2>
        <hr class="gold-divider" style="margin:24px auto 32px">
        <p class="invite__text">${esc(invite.text)}</p>
        <a href="${esc(invite.link)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Присоединиться</a>
      </div>
    </section>`;
}

function renderFooter(db) {
  const c = db.contacts || {};
  const s = c.social || {};
  const brand = db.brand || {};
  const year = new Date().getFullYear();

  const social = [
    s.vk && `<a href="${esc(s.vk)}" target="_blank" rel="noopener" aria-label="VK"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5h-3c-.5 0-.7.3-.9.7-.6 1.3-1.6 3.1-2.4 3.1-.4 0-.5-.3-.5-.9V5.6c0-.4-.2-.6-.6-.6h-3.3c-.3 0-.5.2-.5.4 0 .5.6.6.7 1.7v2.4c0 .6-.1.7-.3.7-.7 0-1.9-1.9-2.6-4-.1-.4-.3-.6-.7-.6H3.6c-.4 0-.6.2-.6.5 0 .5 1 4.4 4.2 7.6 2 2 4.5 3 6.7 3 .5 0 .6-.2.6-.6v-1.7c0-.4.1-.6.4-.6.5 0 1.3 1.2 2.1 2.3.6.8.8.6 1.3.6h2.5c.4 0 .7-.2.5-.7-.2-.6-1.5-2.4-2.4-3.3-.2-.2-.1-.4 0-.5.7-.9 2.4-3.1 2.6-4 .1-.4 0-.6-.3-.6z"/></svg></a>`,
    s.telegram && `<a href="${esc(s.telegram)}" target="_blank" rel="noopener" aria-label="Telegram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3l-3.2 15c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L4.6 13.3l-4.8-1.5c-1-.3-1-1 .2-1.5l18.8-7.3c.9-.3 1.6.2 1.3 1.3z"/></svg></a>`,
    s.youtube && `<a href="${esc(s.youtube)}" target="_blank" rel="noopener" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5c-.2-1-.8-1.7-1.8-2C19.4 5 12 5 12 5s-7.4 0-9.2.5c-1 .3-1.6 1-1.8 2C.5 9.3.5 12 .5 12s0 2.7.5 4.5c.2 1 .8 1.7 1.8 2C4.6 19 12 19 12 19s7.4 0 9.2-.5c1-.3 1.6-1 1.8-2 .5-1.8.5-4.5.5-4.5s0-2.7-.5-4.5zM9.8 15.3V8.7l6.2 3.3-6.2 3.3z"/></svg></a>`
  ].filter(Boolean).join("");

  return `
    <div class="container">
      <div class="footer__grid">
        <div>
          <a href="#hero" class="logo">${esc(brand.name || "Broadway Guitardo")}</a>
          <p class="footer__about">${esc(brand.tagline || "Мюзиклы в живом исполнении")}</p>
        </div>
        <div class="footer__col">
          <h4>Навигация</h4>
          <ul>
            <li><a href="#about">О нас</a></li>
            <li><a href="#afisha">Афиша</a></li>
            <li><a href="#invite">В хор</a></li>
          </ul>
        </div>
        <div class="footer__col">
          <h4>Контакты</h4>
          <ul>
            ${c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ""}
            ${c.phone ? `<li><a href="tel:${esc((c.phone || "").replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a></li>` : ""}
          </ul>
        </div>
        <div class="footer__col">
          <h4>Мы в сети</h4>
          <div class="footer__socials">${social}</div>
        </div>
      </div>
      <div class="footer__bottom">© ${year} ${esc(brand.name || "Broadway Guitardo")}. Все права защищены.</div>
    </div>`;
}

/* ==========================================================================
   КАРУСЕЛЬ
   ========================================================================== */
function initCarousel(root) {
  const track = $(".carousel__track", root);
  const slides = [...root.querySelectorAll(".carousel__slide")];
  if (slides.length <= 1) return;

  const dotsWrap = $(".carousel__dots", root);
  let current = 0;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "carousel__dot" + (i === 0 ? " active" : "");
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = [...dotsWrap.children];

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, idx) => d.classList.toggle("active", idx === current));
    restart();
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  $(".next", root).addEventListener("click", next);
  $(".prev", root).addEventListener("click", prev);

  const start = () => (timer = setInterval(next, 5000));
  const restart = () => { clearInterval(timer); start(); };
  root.addEventListener("mouseenter", () => clearInterval(timer));
  root.addEventListener("mouseleave", start);

  let startX = 0;
  root.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  root.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
  });

  start();
}

/* ==========================================================================
   МОДАЛКА СПЕКТАКЛЯ
   ========================================================================== */
function openProject(id) {
  const p = (DB.projects || []).find((x) => x.id === id);
  if (!p) return;

  const gallery = (p.gallery || []).map((src, i) => `
    <div class="carousel__slide">
      <img src="${esc(imgUrl(src))}" alt="Кадр ${i + 1}" loading="lazy">
    </div>`).join("");

  const soloistText = (s) =>
    s && typeof s === "object" ? [s.name, s.role].filter(Boolean).join(" — ") : String(s || "");
  const soloists = (p.soloists || []).map((s) => `<li>${esc(soloistText(s))}</li>`).join("");

  const others = (DB.projects || [])
    .filter((x) => x.id !== id)
    .slice(0, 3)
    .map((x) => `
      <a class="mini-card" data-project="${esc(x.id)}">
        <img src="${esc(imgUrl(x.poster))}" alt="${esc(x.title)}">
        <span>${esc(x.title)}</span>
      </a>`).join("");

  $("#projectBody").innerHTML = `
    <div class="pd">
      <div class="pd__top">
        <div class="pd__poster">
          <img src="${esc(imgUrl(p.poster))}" alt="${esc(p.title)}">
        </div>
        <div class="pd__info">
          <h2 class="pd__title">${esc(p.title)}</h2>
          <p class="pd__meta">${esc(p.date)}${p.tag ? " · " + esc(p.tag) : ""}</p>
          ${p.duration || formatPrice(p.priceFrom, p.priceTo) ? `<p class="pd__details">${[
            p.duration ? esc(p.duration) : "",
            formatPrice(p.priceFrom, p.priceTo) ? esc(formatPrice(p.priceFrom, p.priceTo)) : ""
          ].filter(Boolean).join(" · ")}</p>` : ""}
          <hr class="gold-divider">
          <p class="pd__desc">${esc(p.description)}</p>
          ${p.ticketLink ? `<a href="${esc(p.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener">Купить билеты</a>` : ""}
        </div>
      </div>

      ${soloists ? `<div class="pd__block">
        <h3 class="pd__h3">Солисты</h3>
        <ul class="pd__soloists">${soloists}</ul>
      </div>` : ""}

      ${gallery ? `<div class="pd__block">
        <h3 class="pd__h3">Фотографии с постановки</h3>
        <div class="carousel pd__carousel" data-carousel>
          <div class="carousel__track">${gallery}</div>
          ${(p.gallery || []).length > 1 ? `
            <button class="carousel__arrow prev" aria-label="Назад">‹</button>
            <button class="carousel__arrow next" aria-label="Вперёд">›</button>
            <div class="carousel__dots"></div>` : ""}
        </div>
      </div>` : ""}

      ${others ? `<div class="pd__block">
        <h3 class="pd__h3">Другие проекты</h3>
        <div class="pd__others">${others}</div>
      </div>` : ""}
    </div>`;

  // Инициализируем карусель внутри модалки
  $("#projectBody").querySelectorAll("[data-carousel]").forEach(initCarousel);

  const modal = $("#projectModal");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal__panel").scrollTop = 0;
}

function closeProject() {
  $("#projectModal").classList.remove("open");
  document.body.style.overflow = "";
}

/* ==========================================================================
   МОДАЛКА ТРЕЙЛЕРА
   ========================================================================== */
function openTrailer() {
  const hero = DB.hero || {};
  let body = "";
  if (hero.trailerFile) {
    const url = imgUrl(hero.trailerFile);
    body = `<video controls autoplay style="width:100%;height:100%;object-fit:contain;background:#000">
              <source src="${esc(url)}" type="${videoType(url)}">
            </video>`;
  } else if (hero.videoTrailerUrl) {
    body = `<iframe src="${esc(hero.videoTrailerUrl)}?autoplay=1" title="Трейлер" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  $("#trailerBody").innerHTML = body;
  $("#trailerModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeTrailer() {
  $("#trailerBody").innerHTML = "";
  $("#trailerModal").classList.remove("open");
  document.body.style.overflow = "";
}

/* ==========================================================================
   ОБЩИЕ ВЗАИМОДЕЙСТВИЯ
   ========================================================================== */
function initUI() {
  // Шапка
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll);
  onScroll();

  // Бургер
  const burger = $("#burger");
  const nav = $("#nav");
  burger.addEventListener("click", () => {
    burger.classList.toggle("active");
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("active");
      nav.classList.remove("open");
    })
  );

  // Fade-up
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // Карусели
  document.querySelectorAll("[data-carousel]").forEach(initCarousel);

  // Делегирование кликов
  document.addEventListener("click", (e) => {
    const proj = e.target.closest("[data-project]");
    if (proj) { e.preventDefault(); openProject(proj.dataset.project); return; }
    if (e.target.closest("[data-open-trailer]")) { openTrailer(); return; }
    if (e.target.closest("[data-close-trailer]") || e.target.id === "trailerModal") { closeTrailer(); return; }
    if (e.target.closest("[data-close-project]") || e.target.id === "projectModal") { closeProject(); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#trailerModal").classList.contains("open")) closeTrailer();
    if ($("#projectModal").classList.contains("open")) closeProject();
  });
}

/* ==========================================================================
   ЗАГРУЗКА И СТАРТ
   ========================================================================== */
async function boot() {
  try {
    const res = await fetch("/api/content");
    if (!res.ok) throw new Error("Не удалось загрузить данные");
    DB = await res.json();
  } catch (err) {
    $("#bootScreen").innerHTML = `Ошибка: ${esc(err.message)}.<br>Запустите бэкенд: <code>npm start</code>`;
    $("#bootScreen").classList.add("error");
    return;
  }

  // SEO
  if (DB.seo?.title) document.title = DB.seo.title;
  if (DB.brand?.name) {
    $("#logo").innerHTML = esc(DB.brand.name);
  }

  // Рендер
  $("#app").innerHTML =
    renderHero(DB.hero) +
    renderAbout(DB.about) +
    renderLeaders(DB) +
    renderAfisha(DB.projects) +
    renderInvite(DB.choirInvite);

  $("#footer").innerHTML = renderFooter(DB);

  initUI();
}

boot();
