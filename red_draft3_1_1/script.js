/* ==========================================================================
   BROADWAY GUITARDO — red_draft «Dark Red» + живые данные из /api/content
   Оригинальные приложения "/", "/v2"…"/v5" не затрагиваются.
   ========================================================================== */

/* --- Утилиты --- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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

function projectDetailMeta(p = {}) {
  const price = formatPrice(p.priceFrom, p.priceTo);
  const priceRow = p.freeAdmission
    ? `<dt>Стоимость</dt><dd>Вход свободный</dd>`
    : (price ? `<dt>Стоимость</dt><dd>${esc(price)}</dd>` : "");
  return `
    ${p.duration ? `<dt>Длительность</dt><dd>${esc(p.duration)}</dd>` : ""}
    ${priceRow}`;
}

// Статус-плашки спектакля (вход свободный / билетов нет) — правый верх постера
function projectBadges(p = {}) {
  const items = [];
  if (p.freeAdmission) items.push(`<span class="poster__badge poster__badge--free">Вход свободный</span>`);
  if (p.soldOut) items.push(`<span class="poster__badge poster__badge--sold">Билетов нет</span>`);
  return items.length ? `<div class="poster__badges">${items.join("")}</div>` : "";
}

function videoType(url) {
  if (url.endsWith(".webm")) return "video/webm";
  if (url.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

function telHref(phone) { return (phone || "").replace(/[^\d+]/g, ""); }

// Солист → {name, role, photo}
function parseSoloist(s) {
  if (s && typeof s === "object") {
    return { name: s.name || "", role: s.role || "", photo: s.photo || "" };
  }
  const m = String(s).split(/\s+[—–-]\s+/);
  return { name: (m[0] || "").trim(), role: (m[1] || "").trim(), photo: "" };
}

function monogram(name) {
  return (name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
}

function soloistCard(s, extraClass = "") {
  const { name, role, photo } = parseSoloist(s);
  const inner = photo
    ? `<img src="${esc(imgUrl(photo))}" alt="${esc(name)}" loading="lazy">`
    : `<span class="soloist__mono">${esc(monogram(name))}</span>`;
  return `
    <div class="soloist${extraClass ? " " + extraClass : ""}">
      <div class="soloist__photo">${inner}</div>
      <p class="soloist__name">${esc(name)}</p>
      ${role ? `<p class="soloist__role">${esc(role)}</p>` : ""}
    </div>`;
}

// Бренд "Broadway Guitardo" → первое слово крупно (display), остальное — трекинг-капс
function brandParts(name) {
  const parts = (name || "Broadway Guitardo").trim().split(/\s+/);
  const first = parts.shift() || "";
  return { first, rest: parts.join(" ") };
}

const QUOTE_DEFAULT = "Мы создаём мюзиклы, в которых зритель становится частью истории";
const SLOGAN_DEFAULT = "Наши постановки — синтез мощного вокала, драматической игры и сценического волшебства";

/* --- Состояние --- */
let DB = null;

function featuredProject(db) {
  const projects = db.projects || [];
  if (!projects.length) return null;
  const heroTitle = (db.hero?.title || "").trim().toLowerCase();
  return projects.find((x) => (x.title || "").trim().toLowerCase() === heroTitle) || projects[0];
}

/* ==========================================================================
   РЕНДЕР СЕКЦИЙ
   ========================================================================== */

function renderHero(db) {
  const hero = db.hero || {};
  const brand = db.brand || {};
  const { first, rest } = brandParts(brand.name);
  const bgVideo = hero.videoFile ? imgUrl(hero.videoFile) : null;
  const media = bgVideo
    ? `<video class="hero__bg hero__bg--video" autoplay muted loop playsinline poster="${esc(imgUrl(hero.background))}">
         <source src="${esc(bgVideo)}" type="${videoType(bgVideo)}">
       </video>`
    : `<div class="hero__bg" style="background-image:url('${esc(imgUrl(hero.background))}')"></div>`;

  const hasTrailer = !!(hero.trailerFile || hero.videoTrailerUrl);
  const sub = brand.tagline
    ? "Место, где музыка, сцена и атмосфера<br>объединяются в полноценный опыт"
    : esc(hero.subtitle);

  // Дата премьеры для обратного отсчёта — из текущего (featured) спектакля
  const featured = featuredProject(db);
  const deadline = parseRuDate(featured?.date);
  const countdown = deadline
    ? `<div class="countdown" id="countdown" data-deadline="${deadline.toISOString()}" aria-label="До премьеры">
         <div class="countdown__unit"><span class="countdown__num" data-cd="days">--</span><span class="countdown__label">дней</span></div>
         <span class="countdown__sep">:</span>
         <div class="countdown__unit"><span class="countdown__num" data-cd="hours">--</span><span class="countdown__label">часов</span></div>
         <span class="countdown__sep">:</span>
         <div class="countdown__unit"><span class="countdown__num" data-cd="mins">--</span><span class="countdown__label">минут</span></div>
       </div>
       <p class="countdown__caption">до премьеры «${esc(featured?.title || "")}»</p>`
    : "";

  return `
    <section class="hero" id="hero">
      ${media}
      <div class="hero__overlay"></div>
      <div class="hero__spotlight" id="heroSpotlight" aria-hidden="true"></div>
      <canvas class="hero__embers" id="heroEmbers" aria-hidden="true"></canvas>
      <div class="hero__content">
        <h1 class="hero__title">${esc(first)}</h1>
        ${rest ? `<p class="hero__brandsub">${esc(rest)}</p>` : ""}
        <div class="hero__line"></div>
        <p class="hero__subtitle">${sub}</p>
        ${countdown}
        <div class="hero__actions">
          <a href="#afisha" class="btn btn-primary">Смотреть</a>
          ${hasTrailer ? `<button class="btn btn-secondary" data-open-trailer>Трейлер</button>` : ""}
        </div>
      </div>
      <div class="hero__scroll" aria-hidden="true"><span class="hero__scroll-line"></span></div>
    </section>`;
}

/* ==========================================================================
   ДАТА ПРЕМЬЕРЫ + ОБРАТНЫЙ ОТСЧЁТ
   ========================================================================== */
const RU_MONTHS = {
  январ: 0, феврал: 1, март: 2, апрел: 3, мая: 4, ма: 4, июн: 5, июл: 6,
  август: 7, сентябр: 8, октябр: 9, ноябр: 10, декабр: 11
};

// "26 сентября 2026, 19:00" → Date | null
function parseRuDate(str) {
  if (!str) return null;
  const m = String(str).toLowerCase()
    .match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})(?:[\s,]+(\d{1,2})[:.](\d{2}))?/);
  if (!m) return null;
  const day = +m[1];
  const word = m[2];
  const year = +m[3];
  const hour = m[4] ? +m[4] : 19;
  const min = m[5] ? +m[5] : 0;
  // Ищем месяц по началу слова (родительный падеж: «сентября» → «сентябр»)
  let month = -1;
  for (const [key, idx] of Object.entries(RU_MONTHS)) {
    if (word.startsWith(key)) { month = idx; break; }
  }
  if (month < 0) return null;
  const d = new Date(year, month, day, hour, min, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function initCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;
  const deadline = new Date(el.dataset.deadline).getTime();
  if (Number.isNaN(deadline)) { el.remove(); return; }

  const out = {
    days: el.querySelector('[data-cd="days"]'),
    hours: el.querySelector('[data-cd="hours"]'),
    mins: el.querySelector('[data-cd="mins"]')
  };
  const pad = (n) => String(n).padStart(2, "0");
  let timer = null;

  function tick() {
    const diff = deadline - Date.now();
    if (diff <= 0) {
      el.classList.add("countdown--live");
      el.innerHTML = '<span class="countdown__now">Идёт показ</span>';
      if (timer) clearInterval(timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    out.days.textContent = Math.floor(s / 86400);
    out.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    out.mins.textContent = pad(Math.floor((s % 3600) / 60));
  }
  tick();
  // Без секунд — обновляем раз в 30с (минуты всё равно меняются раз в минуту)
  timer = setInterval(tick, 30000);
}

/* ==========================================================================
   HERO FX — спотлайт-курсор + тлеющие угли (canvas)
   ========================================================================== */
const PREFERS_REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SAVE_DATA = navigator.connection && navigator.connection.saveData;
const LOW_END = (navigator.hardwareConcurrency || 8) <= 4;

function initHeroFx() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  initSpotlight(hero);
  if (!PREFERS_REDUCED && !SAVE_DATA) initEmbers(hero);
}

function initSpotlight(hero) {
  const spot = document.getElementById("heroSpotlight");
  if (!spot) return;
  // Десктоп: луч следует за курсором; иначе — мягкий статичный спот
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !PREFERS_REDUCED) {
    let raf = null, mx = 50, my = 38;
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(() => {
        spot.style.setProperty("--mx", mx + "%");
        spot.style.setProperty("--my", my + "%");
        raf = null;
      });
    });
    hero.addEventListener("pointerleave", () => {
      spot.style.setProperty("--mx", "50%");
      spot.style.setProperty("--my", "38%");
    });
  } else {
    spot.classList.add("hero__spotlight--soft");
  }
}

function initEmbers(hero) {
  const canvas = document.getElementById("heroEmbers");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const COUNT = LOW_END ? 18 : 36;
  let particles = [];
  let raf = null, running = false;

  function resize() {
    const r = hero.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial) {
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.2 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.3,
      a: 0.2 + Math.random() * 0.5,
      gold: Math.random() > 0.7
    };
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y -= p.vy;
      p.x += p.vx + Math.sin(p.y * 0.01) * 0.2;
      if (p.y < -10) Object.assign(p, spawn(false));
      const color = p.gold ? "210,170,90" : "219,74,98";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${p.a})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${color},${p.a})`;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(draw);
  }

  function startLoop() { if (!running) { running = true; draw(); } }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  resize();
  particles = Array.from({ length: COUNT }, () => spawn(true));
  window.addEventListener("resize", resize);

  // Анимируем только когда hero виден — экономим батарею на мобиле
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? startLoop() : stopLoop())),
    { threshold: 0.05 }
  );
  io.observe(hero);
}

function renderAbout(about = {}) {
  const photos = about.photos || [];
  const captions = about.captions || [];

  const slides = photos.map((src, i) => `
    <div class="carousel__slide">
      <img src="${esc(imgUrl(src))}" alt="${esc(captions[i] || "О коллективе")}" loading="lazy">
      ${captions[i] ? `<div class="about__caption">${esc(captions[i])}</div>` : ""}
    </div>`).join("");

  const thumbs = photos.map((src, i) => `
    <div class="carousel__thumb${i === 0 ? " active" : ""}"><img src="${esc(imgUrl(src))}" alt="" loading="lazy"></div>`).join("");

  const photoBlock = photos.length
    ? `<div class="about__photo reveal">
         <div class="carousel about__carousel" data-carousel>
           <div class="carousel__track">${slides}</div>
         </div>
         ${photos.length > 1 ? `<div class="carousel__thumbs"><div class="carousel__thumbs-track">${thumbs}</div></div>` : ""}
       </div>`
    : "";

  return `
    <section class="section" id="about">
      <div class="container">
        <div class="about__grid">
          ${photoBlock}
          <div class="about__body reveal d1">
            <p class="section-eyebrow">О коллективе</p>
            <h2 class="section-title">Магия рождается из полумрака</h2>
            <p>${esc(about.text)}</p>
            <div class="about__rule" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>`;
}

// Разбить слова ровно на N строк (остаток — к первым строкам)
function splitIntoLines(text, n) {
  const words = String(text).trim().split(/\s+/);
  n = Math.min(n, words.length) || 1;
  const base = Math.floor(words.length / n);
  const sizes = new Array(n).fill(base);
  // остаток отдаём внутренним строкам (со 2-й), чтобы 1-я была короче — длиннее красная линия
  let rem = words.length % n;
  let idx = 1;
  while (rem > 0) { sizes[idx % n]++; rem--; idx++; }
  const lines = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    lines.push(words.slice(i, i + sizes[k]).join(" "));
    i += sizes[k];
  }
  return lines;
}

// Слоган: ступенчатое асимметричное выравнивание с красными линиями
function renderSlogan(text, id) {
  if (!text) return "";
  const lines = splitIntoLines(text, 4);
  const last = lines.length - 1;
  const rows = lines.map((ln, i) => {
    if (i === 0)
      return `<div class="slg__row slg__row--first"><span>${esc(ln)}</span><i class="slg__line"></i></div>`;
    if (i === last)
      return `<div class="slg__row slg__row--last"><i class="slg__line"></i><span>${esc(ln)}</span></div>`;
    return `<div class="slg__row slg__row--mid"><span>${esc(ln)}</span></div>`;
  }).join("");
  return `
    <section class="slogan"${id ? ` id="${id}"` : ""}>
      <div class="container">
        <div class="slg reveal">${rows}</div>
      </div>
    </section>`;
}

function leaderCard(person = {}, role, delay) {
  return `
    <article class="leader reveal ${delay}">
      <div class="leader__photo">
        <img src="${esc(imgUrl(person.photo))}" alt="${esc(person.name)}" loading="lazy">
      </div>
      <div class="leader__caption">
        <p class="leader__role">${esc(role)}</p>
        <h3 class="leader__name">${esc(person.name)}</h3>
        <p class="leader__bio">${esc(person.bio)}</p>
      </div>
    </article>`;
}

function renderLeaders(db) {
  return `
    <section class="section" id="leaders">
      <div class="container">
        <p class="section-eyebrow reveal">Лица коллектива</p>
        <div class="leaders__grid">
          ${leaderCard(db.artisticDirector, "Художественный руководитель", "")}
          ${leaderCard(db.concertmaster, "Концертмейстер", "d1")}
        </div>
      </div>
    </section>`;
}

function renderAfisha(projects = []) {
  const cards = projects.map((p) => {
    const tag = [p.tag, p.duration].filter(Boolean).join(" · ");
    return `
    <article class="poster" data-project="${esc(p.id)}">
      <div class="poster__media">
        <img src="${esc(imgUrl(p.poster))}" alt="${esc(p.title)}" loading="lazy">
        ${p.date ? `<span class="poster__date">${esc(p.date)}</span>` : ""}
        ${projectBadges(p)}
      </div>
      <h3 class="poster__title">${esc(p.title)}</h3>
      ${tag ? `<p class="poster__tag">${esc(tag)}</p>` : ""}
      <div class="poster__actions">
        <button class="btn btn-secondary" data-project="${esc(p.id)}">О спектакле</button>
        ${p.soldOut
          ? `<span class="btn btn-dark is-sold" aria-disabled="true">Билетов нет</span>`
          : p.ticketLink
            ? `<a class="btn btn-dark" href="${esc(p.ticketLink)}" target="_blank" rel="noopener" data-stop>Билеты</a>`
            : `<button class="btn btn-dark" data-project="${esc(p.id)}">Билеты</button>`}
      </div>
    </article>`;
  }).join("");

  const dots = projects.map((_, i) =>
    `<button class="pcar__dot${i === 0 ? " active" : ""}" aria-label="Слайд ${i + 1}"></button>`
  ).join("");

  return `
    <section class="section" id="afisha">
      <div class="container">
        <h2 class="section-title section-title--red afisha-title reveal">Афиша</h2>
        <div class="pcar reveal" data-pcar>
          <div class="pcar__track">${cards}</div>
          <button class="pcar__arrow pcar__arrow--prev" aria-label="Назад"></button>
          <button class="pcar__arrow pcar__arrow--next" aria-label="Вперёд"></button>
        </div>
        ${projects.length > 3 ? `<div class="pcar__dots">${dots}</div>` : ""}
      </div>
    </section>`;
}

// Детальный блок текущего спектакля (баннер-карусель + инфо + солисты)
function renderFeature(db) {
  const p = featuredProject(db);
  if (!p) return "";

  const gallery = (p.gallery && p.gallery.length) ? p.gallery : [p.poster].filter(Boolean);

  const banners = gallery.map((src, i) => `
    <div class="carousel__slide"><img src="${esc(imgUrl(src))}" alt="Кадр ${i + 1}" loading="lazy"></div>`).join("");

  const soloists = (p.soloists || [])
    .map((s, i) => soloistCard(s, "reveal " + ["", "d1", "d2", "d2"][i % 4]))
    .join("");

  const multi = gallery.length > 1;

  return `
    <section class="feature" id="feature">
      <div class="container">
        <div class="feature__stage reveal">
          <div class="feature__banner carousel" data-carousel>
            <div class="carousel__track">${banners}</div>
            <h2 class="feature__banner-title">${esc(p.title)}</h2>
            ${multi ? `
            <div class="feature__nav">
              <button class="feature__arrow prev" aria-label="Назад"></button>
              <button class="feature__arrow next" aria-label="Вперёд"></button>
            </div>` : ""}
          </div>
        </div>

        <div class="feature__cta reveal">
          <p class="section-eyebrow">Текущий проект</p>
          <p class="feature__cta-desc">${esc(p.description)}</p>
          <div class="hero__actions" style="justify-content:center">
            <button class="btn btn-secondary" data-project="${esc(p.id)}">О спектакле</button>
          </div>
        </div>

      </div>
    </section>`;
}

/* ==========================================================================
   ГАЛЕРЕЯ-МОЗАИКА + СЛОГАН
   ========================================================================== */
function renderGalleryMosaic(db, sloganText, uploadsPhotos) {
  // Фолбэк-источник: фото, прикреплённые к проектам
  const projectPhotos = [];
  (db.projects || []).forEach((p) => {
    (p.gallery || []).forEach((src) => { const u = imgUrl(src); if (!projectPhotos.includes(u)) projectPhotos.push(u); });
    if (p.poster) { const u = imgUrl(p.poster); if (!projectPhotos.includes(u)) projectPhotos.push(u); }
  });

  // Карусель: все фото из папки uploads; если список пуст — фолбэк на фото проектов
  const carouselSrc = (uploadsPhotos && uploadsPhotos.length)
    ? uploadsPhotos.map(imgUrl)
    : projectPhotos;
  if (carouselSrc.length < 2) return "";

  // 3 статичных слота: фото заданы в админке (db.gallery.staticPhotos),
  // иначе берём первые фото из карусели
  const adminStatic = (db.gallery && db.gallery.staticPhotos) || [];
  const stat = [0, 1, 2].map((i) => (adminStatic[i] ? imgUrl(adminStatic[i]) : (carouselSrc[i] || "")));

  // Галерея — горизонтальный скролл крупными кадрами
  const scrollSlides = carouselSrc
    .map((src) => `<div class="gv-scroll__slide"><img src="${esc(src)}" alt="" loading="lazy"></div>`)
    .join("");

  return `
    <section class="section gcm-section" id="gallery">
      <div class="container">

        <!-- Асимметричная мозаика: текст + 3 фото -->
        <div class="gcm-hero reveal">
          <div class="gcm-hero__text">
            <p class="gcm__phrase">${esc(sloganText)}</p>
          </div>
          ${stat[0] ? `<div class="gcm__photo gcm__photo--0"><img src="${esc(stat[0])}" alt="" loading="lazy"></div>` : ""}
          ${stat[1] ? `<div class="gcm__photo gcm__photo--1"><img src="${esc(stat[1])}" alt="" loading="lazy"></div>` : ""}
          ${stat[2] ? `<div class="gcm__photo gcm__photo--2"><img src="${esc(stat[2])}" alt="" loading="lazy"></div>` : ""}
        </div>

        <!-- Галерея: горизонтальный скролл -->
        <div class="gv-scroll-gallery reveal d1">
          <div class="gv-scroll"><div class="gv-scroll__track">${scrollSlides}</div></div>
          <p class="gv-scroll__hint">листайте вбок →</p>
        </div>

      </div>
    </section>`;
}

/* --- Карта --- */
function parseCoords(str) {
  if (!str) return null;
  let parts = String(str).split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) parts = String(str).split(/\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function mapSrc(loc = {}) {
  if (loc.mapUrl) return loc.mapUrl;
  const c = parseCoords(loc.coords);
  if (c) return `https://yandex.ru/map-widget/v1/?ll=${c.lon},${c.lat}&z=17`;
  if (loc.address) return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(loc.address)}&z=16`;
  return "";
}

const MAP_PIN_SVG =
  '<svg viewBox="0 0 24 36" width="32" height="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#db4a62"/>' +
  '<circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>';

function renderLocation(loc = {}) {
  const src = mapSrc(loc);
  if (!src && !loc.address) return "";
  const showPin = !loc.mapUrl && !!parseCoords(loc.coords);
  return `
    <section class="section location" id="location">
      <div class="container">
        <p class="section-eyebrow reveal">Локация</p>
        <h2 class="section-title reveal">${esc(loc.title || "Как добраться")}</h2>
        <hr class="rule reveal">
        <div class="location__grid">
          <div class="location__info reveal">
            ${loc.address ? `<p class="location__address">${esc(loc.address)}</p>` : ""}
            ${loc.note ? `<p class="location__note">${esc(loc.note)}</p>` : ""}
          </div>
          <div class="location__map reveal d1">
            ${src ? `<iframe src="${esc(src)}" width="100%" height="100%" frameborder="0" allowfullscreen="true" loading="lazy" title="Карта проезда"></iframe>` : ""}
            ${showPin ? `<span class="location__pin" aria-hidden="true">${MAP_PIN_SVG}</span>` : ""}
          </div>
        </div>
      </div>
    </section>`;
}

function renderInvite(db) {
  const invite = db.choirInvite || {};
  const brand = db.brand || {};
  const { first, rest } = brandParts(brand.name);
  return `
    <section class="invite" id="invite">
      <div class="container">
        <div class="invite__card reveal">
          <p class="invite__eyebrow">Присоединяйтесь</p>
          <h2 class="invite__title">Стать участником<br>${esc(first)} ${esc(rest)}</h2>
          <p class="invite__text">${esc(invite.text)}</p>
          ${invite.link ? `<a href="${esc(invite.link)}" class="btn btn-dark" target="_blank" rel="noopener noreferrer">Записаться в хор</a>` : ""}
        </div>
      </div>
    </section>`;
}

function renderFooter(db) {
  const c = db.contacts || {};
  const s = c.social || {};
  const brand = db.brand || {};
  const year = new Date().getFullYear();
  const name = brand.name || "Broadway Guitardo";
  const { first: footerFirst, rest: footerRest } = brandParts(name);

  const social = [
    s.vk && `<a href="${esc(s.vk)}" target="_blank" rel="noopener" aria-label="VK"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5h-3c-.5 0-.7.3-.9.7-.6 1.3-1.6 3.1-2.4 3.1-.4 0-.5-.3-.5-.9V5.6c0-.4-.2-.6-.6-.6h-3.3c-.3 0-.5.2-.5.4 0 .5.6.6.7 1.7v2.4c0 .6-.1.7-.3.7-.7 0-1.9-1.9-2.6-4-.1-.4-.3-.6-.7-.6H3.6c-.4 0-.6.2-.6.5 0 .5 1 4.4 4.2 7.6 2 2 4.5 3 6.7 3 .5 0 .6-.2.6-.6v-1.7c0-.4.1-.6.4-.6.5 0 1.3 1.2 2.1 2.3.6.8.8.6 1.3.6h2.5c.4 0 .7-.2.5-.7-.2-.6-1.5-2.4-2.4-3.3-.2-.2-.1-.4 0-.5.7-.9 2.4-3.1 2.6-4 .1-.4 0-.6-.3-.6z"/></svg></a>`,
    s.telegram && `<a href="${esc(s.telegram)}" target="_blank" rel="noopener" aria-label="Telegram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3l-3.2 15c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L4.6 13.3l-4.8-1.5c-1-.3-1-1 .2-1.5l18.8-7.3c.9-.3 1.6.2 1.3 1.3z"/></svg></a>`,
    s.youtube && `<a href="${esc(s.youtube)}" target="_blank" rel="noopener" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5c-.2-1-.8-1.7-1.8-2C19.4 5 12 5 12 5s-7.4 0-9.2.5c-1 .3-1.6 1-1.8 2C.5 9.3.5 12 .5 12s0 2.7.5 4.5c.2 1 .8 1.7 1.8 2C4.6 19 12 19 12 19s7.4 0 9.2-.5c1-.3 1.6-1 1.8-2 .5-1.8.5-4.5.5-4.5s0-2.7-.5-4.5zM9.8 15.3V8.7l6.2 3.3-6.2 3.3z"/></svg></a>`
  ].filter(Boolean).join("");

  return `
    <div class="container">
      <div class="footer__grid">
        <div>
          <p class="footer__logo"><span class="footer__logo-first">${esc(footerFirst)}</span>${footerRest ? `<span class="footer__logo-rest">${esc(footerRest)}</span>` : ""}</p>
          <p class="footer__slogan">${esc(brand.tagline || "Мюзиклы в живом исполнении")}. Театрально-хоровой коллектив.</p>
        </div>
        <div class="footer__col">
          <h4>Навигация</h4>
          <ul>
            <li><a href="#about">О коллективе</a></li>
            <li><a href="#afisha">Афиша</a></li>
            <li><a href="#invite">В хор</a></li>
          </ul>
        </div>
        <div class="footer__col">
          <h4>Контакты</h4>
          <ul>
            ${c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ""}
            ${c.phone ? `<li><a href="tel:${esc(telHref(c.phone))}">${esc(c.phone)}</a></li>` : ""}
          </ul>
        </div>
        <div class="footer__col">
          <h4>Мы в сети</h4>
          <div class="footer__socials">${social}</div>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© ${year} ${esc(name)}. Все права защищены.</span>
        <a href="/admin" class="footer__admin">Вход для администратора</a>
      </div>
    </div>`;
}

/* ==========================================================================
   КАРУСЕЛЬ
   ========================================================================== */
function initCarousel(root) {
  const track = $(".carousel__track", root);
  const slides = $$(".carousel__slide", root);
  if (!track || slides.length <= 1) return;

  const scope = root.parentElement || document;
  const thumbs = $$(".carousel__thumb", scope);
  const thumbTrack = $(".carousel__thumbs-track", scope);
  const VISIBLE = 3; // сколько превью видно одновременно

  let current = 0;
  let timer = null;

  // Превью-карусель: окно из VISIBLE штук, сдвигается вслед за активным слайдом
  function syncThumbs() {
    if (!thumbTrack || thumbs.length <= VISIBLE) return;
    const startIdx = Math.min(Math.max(current - 1, 0), thumbs.length - VISIBLE);
    thumbTrack.style.transform = `translateX(${-thumbs[startIdx].offsetLeft}px)`;
  }

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    thumbs.forEach((t, idx) => t.classList.toggle("active", idx === current));
    syncThumbs();
    restart();
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  $(".next", root)?.addEventListener("click", (e) => { e.stopPropagation(); next(); });
  $(".prev", root)?.addEventListener("click", (e) => { e.stopPropagation(); prev(); });
  thumbs.forEach((t, i) => t.addEventListener("click", () => goTo(i)));

  const start = () => (timer = setInterval(next, 5500));
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
   КАРУСЕЛЬ АФИШИ (показывает 3 карточки, листает по одной)
   ========================================================================== */
function initPosterCarousel(root) {
  const track = $(".pcar__track", root);
  const cards = $$(".poster", root);
  const n = cards.length;
  if (!track || n < 2) return;

  // Мобайл: отдаём нативному scroll-snap (см. CSS) — стрелки/transform не нужны
  if (window.matchMedia("(max-width: 720px)").matches) {
    root.classList.add("pcar--native");
    return;
  }

  const VISIBLE = 3;
  let idx = 0;

  // Ширина одной карточки (с учётом gap) вычисляется динамически
  function cardW() {
    return cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0);
  }

  function goTo(i) {
    const max = Math.max(n - VISIBLE, 0);
    idx = Math.min(Math.max(i, 0), max);
    track.style.transform = `translateX(-${idx * cardW()}px)`;

    // Стрелки
    $(".pcar__arrow--prev", root).style.opacity = idx === 0 ? "0.3" : "1";
    $(".pcar__arrow--next", root).style.opacity = idx >= max ? "0.3" : "1";

    // Точки
    const dots = $$(".pcar__dot", root.closest(".container") || document);
    dots.forEach((d, j) => d.classList.toggle("active", j === idx));
  }

  $(".pcar__arrow--prev", root).addEventListener("click", (e) => { e.stopPropagation(); goTo(idx - 1); });
  $(".pcar__arrow--next", root).addEventListener("click", (e) => { e.stopPropagation(); goTo(idx + 1); });

  // Свайп на тач
  let startX = 0;
  root.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  root.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? idx + 1 : idx - 1);
  });

  // Пересчёт при ресайзе
  window.addEventListener("resize", () => goTo(idx));

  goTo(0);
}

/* ==========================================================================
   МОДАЛКА СПЕКТАКЛЯ
   ========================================================================== */
function openProject(id) {
  const p = (DB.projects || []).find((x) => x.id === id);
  if (!p) return;

  const slides = (p.gallery || []).map((src, i) => `
    <div class="carousel__slide"><img src="${esc(imgUrl(src))}" alt="Кадр ${i + 1}" loading="lazy"></div>`).join("");

  const thumbs = (p.gallery || []).map((src, i) => `
    <div class="carousel__thumb${i === 0 ? " active" : ""}"><img src="${esc(imgUrl(src))}" alt="" loading="lazy"></div>`).join("");

  const soloists = (p.soloists || []).map((s) => soloistCard(s)).join("");

  const others = (DB.projects || [])
    .filter((x) => x.id !== id)
    .slice(0, 3)
    .map((x) => `
      <a class="mini-card" data-project="${esc(x.id)}">
        <img src="${esc(imgUrl(x.poster))}" alt="${esc(x.title)}" loading="lazy">
        <span>${esc(x.title)}</span>
      </a>`).join("");

  $("#projectBody").innerHTML = `
    <div class="pd">
      <div class="pd__banner">
        <img src="${esc(imgUrl((p.gallery && p.gallery[0]) || p.poster))}" alt="${esc(p.title)}">
        <h2 class="pd__banner-title">${esc(p.title)}</h2>
      </div>

      <div class="pd__info">
        <dl class="pd__meta">
          <dt>Дата</dt><dd>${esc(p.date)}</dd>
          ${p.tag ? `<dt>Формат</dt><dd>${esc(p.tag)}</dd>` : ""}
          ${projectDetailMeta(p)}
        </dl>
        <div class="pd__desc">
          <p>${esc(p.description)}</p>
          ${p.soldOut
            ? `<span class="btn btn-primary is-sold" aria-disabled="true">Билетов нет</span>`
            : p.ticketLink ? `<a href="${esc(p.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener">Билеты</a>` : ""}
        </div>
      </div>

      ${soloists ? `<div class="pd__block">
        <h3 class="pd__h3">Солисты</h3>
        <div class="soloists__grid">${soloists}</div>
      </div>` : ""}

      ${slides ? `<div class="pd__block">
        <h3 class="pd__h3">Галерея</h3>
        <div class="carousel" data-carousel>
          <div class="carousel__track">${slides}</div>
          ${(p.gallery || []).length > 1 ? `
            <button class="carousel__arrow prev" aria-label="Назад"></button>
            <button class="carousel__arrow next" aria-label="Вперёд"></button>` : ""}
        </div>
        ${(p.gallery || []).length > 1 ? `<div class="carousel__thumbs">${thumbs}</div>` : ""}
      </div>` : ""}

      ${others ? `<div class="pd__block">
        <h3 class="pd__h3">Другие спектакли</h3>
        <div class="pd__others">${others}</div>
      </div>` : ""}
    </div>`;

  $$("[data-carousel]", $("#projectBody")).forEach(initCarousel);

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
    body = `<video controls autoplay playsinline><source src="${esc(url)}" type="${videoType(url)}"></video>`;
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
   МОБИЛЬНЫЙ ЛИПКИЙ БАР ДЕЙСТВИЙ
   ========================================================================== */
function initMbar() {
  const bar = document.getElementById("mbar");
  if (!bar) return;

  const featured = featuredProject(DB);
  const ticket = featured?.ticketLink;
  const choir = DB.choirInvite?.link;

  const ticketBtn = featured?.soldOut
    ? `<span class="mbar__btn mbar__btn--primary is-sold" aria-disabled="true">Билетов нет</span>`
    : ticket
      ? `<a class="mbar__btn mbar__btn--primary" href="${esc(ticket)}" target="_blank" rel="noopener" data-stop>Билеты</a>`
      : `<a class="mbar__btn mbar__btn--primary" href="#afisha">Билеты</a>`;
  const choirBtn = choir
    ? `<a class="mbar__btn mbar__btn--ghost" href="${esc(choir)}" target="_blank" rel="noopener" data-stop>В хор</a>`
    : `<a class="mbar__btn mbar__btn--ghost" href="#invite">В хор</a>`;

  bar.innerHTML = ticketBtn + choirBtn;

  // Появляется после hero, прячется у футера, чтобы не перекрывать его
  const hero = document.getElementById("hero");
  const footer = document.getElementById("footer");
  let pastHero = false, atFooter = false;
  const apply = () => bar.classList.toggle("visible", pastHero && !atFooter);

  if (hero) {
    new IntersectionObserver(
      ([e]) => { pastHero = !e.isIntersecting; apply(); },
      { threshold: 0, rootMargin: "-60% 0px 0px 0px" }
    ).observe(hero);
  } else {
    pastHero = true; apply();
  }
  if (footer) {
    new IntersectionObserver(
      ([e]) => { atFooter = e.isIntersecting; apply(); },
      { threshold: 0 }
    ).observe(footer);
  }
}

/* ==========================================================================
   МАГНИТНЫЕ КНОПКИ (десктоп)
   ========================================================================== */
function initMagnetic() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || PREFERS_REDUCED) return;
  const STRENGTH = 0.25, MAX = 8;
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = Math.max(-MAX, Math.min(MAX, (e.clientX - (r.left + r.width / 2)) * STRENGTH));
      const dy = Math.max(-MAX, Math.min(MAX, (e.clientY - (r.top + r.height / 2)) * STRENGTH));
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
}

/* ==========================================================================
   ОБЩИЕ ВЗАИМОДЕЙСТВИЯ
   ========================================================================== */
function initUI() {
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => observer.observe(el));

  // Эффект #1: specular-sweep по заголовкам/лейблам/слогану — повтор при каждом заходе в экран
  const sweepObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      e.target.classList.toggle("swept", e.isIntersecting);  // ушёл из вида → сброс, вернулся → повтор
    }),
    { threshold: 0.25 }
  );
  $$(".section-title, .afisha-title, .slg__row span, .section-eyebrow, .invite__title").forEach((el) => {
    el.classList.add("sweepable");
    sweepObserver.observe(el);
  });

  // Эффект #4: clip-reveal медиа при входе СЕКЦИИ в экран (наблюдаем секции — надёжно)
  const riseObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("media-shown"); riseObserver.unobserve(e.target); }
    }),
    { threshold: 0.15 }
  );
  ["#afisha", "#feature"].forEach((sel) => {
    const sec = document.querySelector(sel);
    if (!sec) return;
    sec.classList.add("clip-armed");
    riseObserver.observe(sec);
  });
  // Фолбэк: если наблюдатель не сработал — гарантированно раскрыть медиа через 4с
  setTimeout(() => $$(".clip-armed").forEach((s) => s.classList.add("media-shown")), 4000);

  $$("[data-carousel]").forEach(initCarousel);
  $$("[data-pcar]").forEach(initPosterCarousel);
  initHeroFx();
  initCountdown();
  initMbar();
  initMagnetic();

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-stop]")) return; // прямые ссылки (Билеты)
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
function hideBoot() {
  const boot = $("#boot");
  if (!boot) return;
  boot.classList.add("done");
  // Снять с потока после завершения анимации занавеса
  setTimeout(() => boot.remove(), 1100);
}

async function boot() {
  const started = performance.now();
  try {
    const res = await fetch("/api/content");
    if (!res.ok) throw new Error("Не удалось загрузить данные");
    DB = await res.json();
  } catch (err) {
    const bootEl = $("#boot");
    const hint = $("#bootHint");
    if (bootEl) bootEl.classList.add("error");
    if (hint) hint.innerHTML = `Ошибка: ${esc(err.message)}.<br>Запустите бэкенд: <code>npm start</code>`;
    return;
  }

  if (DB.seo?.title) document.title = DB.seo.title;
  if (DB.brand?.name) {
    const { first, rest } = brandParts(DB.brand.name);
    $("#logo").innerHTML = `${esc(first)} <b>${esc(rest)}</b>`;
  }

  const quote = DB.about?.quote || QUOTE_DEFAULT;

  // Все фото из папки uploads — для карусели галереи
  let uploadsPhotos = [];
  try {
    const pr = await fetch("/api/gallery/photos");
    if (pr.ok) uploadsPhotos = (await pr.json()).photos || [];
  } catch (e) { /* фолбэк на фото проектов внутри renderGalleryMosaic */ }

  $("#app").innerHTML =
    renderHero(DB) +
    renderAbout(DB.about) +
    renderSlogan(quote) +
    renderLeaders(DB) +
    renderAfisha(DB.projects) +
    renderFeature(DB) +
    renderGalleryMosaic(DB, SLOGAN_DEFAULT, uploadsPhotos) +
    renderInvite(DB) +
    renderLocation(DB.location);

  $("#footer").innerHTML = renderFooter(DB);

  initUI();

  // Увертюра-занавес: держим минимум N мс (полную — раз за сессию), затем поднимаем.
  // Удержание НЕ зависит от reduced-motion (это задержка, а не «движение») —
  // под reduced-motion CSS гасит лампочки/анимацию штор, но занавес всё равно показывается.
  // Клик по занавесу — пропустить.
  const seen = sessionStorage.getItem("seenBoot");
  const minShow = seen ? 700 : 1500;
  sessionStorage.setItem("seenBoot", "1");

  let curtainUp = false;
  const raiseCurtain = () => { if (curtainUp) return; curtainUp = true; hideBoot(); };
  $("#boot")?.addEventListener("click", raiseCurtain, { once: true });

  const elapsed = performance.now() - started;
  setTimeout(raiseCurtain, Math.max(0, minShow - elapsed));
}

boot();
