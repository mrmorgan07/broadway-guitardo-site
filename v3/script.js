/* ==========================================================================
   BROADWAY GUITARDO — v3 (стиль Crave + живые данные из /api/content)
   Оригинальные приложения на "/" и "/v2" не затрагиваются.
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
  return parts.length ? `<p class="poster__meta">${parts.join(" · ")}</p>` : "";
}

function projectDetailMeta(p = {}) {
  const price = formatPrice(p.priceFrom, p.priceTo);
  return `
    ${p.duration ? `<dt>Длительность</dt><dd>${esc(p.duration)}</dd>` : ""}
    ${price ? `<dt>Стоимость</dt><dd>${esc(price)}</dd>` : ""}`;
}

function videoType(url) {
  if (url.endsWith(".webm")) return "video/webm";
  if (url.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

// Телефон → tel:
function telHref(phone) {
  return (phone || "").replace(/[^\d+]/g, "");
}

// Солист → {name, role, photo} (поддержка старых строк "Имя — Роль" и объектов)
function parseSoloist(s) {
  if (s && typeof s === "object") {
    return { name: s.name || "", role: s.role || "", photo: s.photo || "" };
  }
  const m = String(s).split(/\s+[—–-]\s+/);
  return { name: (m[0] || "").trim(), role: (m[1] || "").trim(), photo: "" };
}

// Карточка солиста: фото при наличии, иначе монограмма
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

// Монограмма (инициалы) для аватара
function monogram(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

const QUOTE_DEFAULT = "Мы создаём мюзиклы, в которых зритель становится частью истории";

/* --- Состояние --- */
let DB = null;

/* ==========================================================================
   РЕНДЕР СЕКЦИЙ
   ========================================================================== */

function renderHero(hero = {}) {
  const bgVideo = hero.videoFile ? imgUrl(hero.videoFile) : null;
  const media = bgVideo
    ? `<video class="hero__bg hero__bg--video" autoplay muted loop playsinline>
         <source src="${esc(bgVideo)}" type="${videoType(bgVideo)}">
       </video>`
    : `<div class="hero__bg" style="background-image:url('${esc(imgUrl(hero.background))}')"></div>`;

  const hasTrailer = !!(hero.trailerFile || hero.videoTrailerUrl);

  return `
    <section class="hero" id="hero">
      ${media}
      <div class="hero__overlay"></div>
      <div class="hero__content">
        <p class="hero__eyebrow">${esc(hero.eyebrow)}</p>
        <h1 class="hero__title">${esc(hero.title)}</h1>
        <div class="hero__line"></div>
        <p class="hero__subtitle">${esc(hero.subtitle)}</p>
        <div class="hero__actions">
          <a href="#afisha" class="btn btn-primary">Купить билеты</a>
          ${hasTrailer ? `<button class="btn btn-secondary" data-open-trailer>Смотреть трейлер</button>` : ""}
        </div>
      </div>
      <div class="hero__scroll">Листайте вниз</div>
    </section>`;
}

function renderAbout(about = {}) {
  const photos = about.photos || [];
  const captions = about.captions || [];
  const quote = about.quote || QUOTE_DEFAULT;

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
           ${photos.length > 1 ? `
             <button class="carousel__arrow prev" aria-label="Назад">‹</button>
             <button class="carousel__arrow next" aria-label="Вперёд">›</button>` : ""}
         </div>
         ${photos.length > 1 ? `<div class="carousel__thumbs">${thumbs}</div>` : ""}
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
            <blockquote class="about__quote">«${esc(quote)}»</blockquote>
            <a href="#leaders" class="btn btn-secondary">Познакомиться</a>
          </div>
        </div>
      </div>
    </section>`;
}

function leaderCard(person = {}, role, delay) {
  return `
    <article class="leader reveal ${delay}">
      <img src="${esc(imgUrl(person.photo))}" alt="${esc(person.name)}" loading="lazy">
      <div class="leader__caption">
        <h3 class="leader__name">${esc(person.name)}</h3>
        <p class="leader__role">${esc(role)}</p>
        <p class="leader__bio">${esc(person.bio)}</p>
      </div>
    </article>`;
}

function renderLeaders(db) {
  return `
    <section class="section" id="leaders">
      <div class="container">
        <p class="section-eyebrow reveal">Лица коллектива</p>
        <h2 class="section-title reveal">Руководство</h2>
        <hr class="rule reveal">
        <div class="leaders__grid">
          ${leaderCard(db.artisticDirector, "Художественный руководитель", "")}
          ${leaderCard(db.concertmaster, "Концертмейстер", "d1")}
        </div>
      </div>
    </section>`;
}

function renderAfisha(projects = []) {
  const cards = projects.map((p, i) => `
    <article class="poster reveal ${["", "d1", "d2"][i % 3]}" data-project="${esc(p.id)}">
      <img src="${esc(imgUrl(p.poster))}" alt="${esc(p.title)}" loading="lazy">
      <div class="poster__overlay">
        <h3 class="poster__title">${esc(p.title)}</h3>
        <p class="poster__date">${esc(p.date)}${p.tag ? " · " + esc(p.tag) : ""}</p>
        ${projectCardMeta(p)}
        <div class="poster__buy"><span class="btn btn-primary">Подробнее</span></div>
      </div>
    </article>`).join("");

  return `
    <section class="section" id="afisha">
      <div class="container">
        <p class="section-eyebrow reveal">Ближайшие показы</p>
        <h2 class="section-title reveal">Афиша</h2>
        <hr class="rule reveal">
        <div class="poster-grid">${cards}</div>
      </div>
    </section>`;
}

// Детальный блок текущего спектакля (привязан к hero.title, иначе первый проект)
function renderFeature(db) {
  const projects = db.projects || [];
  if (!projects.length) return "";
  const heroTitle = (db.hero?.title || "").trim().toLowerCase();
  const p =
    projects.find((x) => (x.title || "").trim().toLowerCase() === heroTitle) ||
    projects[0];

  const banner = (p.gallery && p.gallery[0]) || p.poster;

  const soloists = (p.soloists || [])
    .map((s, i) => soloistCard(s, "reveal " + ["", "d1", "d2", "d2"][i % 4]))
    .join("");

  const slides = (p.gallery || []).map((src, i) => `
    <div class="carousel__slide"><img src="${esc(imgUrl(src))}" alt="Кадр ${i + 1}" loading="lazy"></div>`).join("");

  const thumbs = (p.gallery || []).map((src, i) => `
    <div class="carousel__thumb${i === 0 ? " active" : ""}"><img src="${esc(imgUrl(src))}" alt="" loading="lazy"></div>`).join("");

  return `
    <section class="feature" id="feature">
      <div class="feature__banner">
        <img src="${esc(imgUrl(banner))}" alt="${esc(p.title)}" loading="lazy">
        <h2 class="feature__banner-title">${esc(p.title)}</h2>
      </div>

      <div class="container">
        <div class="feature__info">
          <dl class="feature__meta reveal">
            <dt>Дата</dt><dd>${esc(p.date)}</dd>
            ${p.tag ? `<dt>Формат</dt><dd>${esc(p.tag)}</dd>` : ""}
            ${projectDetailMeta(p)}
          </dl>
          <div class="feature__desc reveal d1">
            <p>${esc(p.description)}</p>
            ${p.ticketLink ? `<a href="${esc(p.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener">Купить билеты</a>` : ""}
          </div>
        </div>
      </div>

      ${soloists ? `
      <div class="container soloists">
        <p class="section-eyebrow reveal">В ролях</p>
        <h2 class="section-title reveal">Солисты</h2>
        <hr class="rule reveal">
        <div class="soloists__grid">${soloists}</div>
      </div>` : ""}

      ${slides ? `
      <div class="container gallery">
        <p class="section-eyebrow reveal">Со сцены</p>
        <h2 class="section-title reveal">Галерея</h2>
        <hr class="rule reveal">
        <div class="carousel reveal" data-carousel>
          <div class="carousel__track">${slides}</div>
          ${(p.gallery || []).length > 1 ? `
            <button class="carousel__arrow prev" aria-label="Назад">‹</button>
            <button class="carousel__arrow next" aria-label="Вперёд">›</button>` : ""}
        </div>
        ${(p.gallery || []).length > 1 ? `<div class="carousel__thumbs">${thumbs}</div>` : ""}
      </div>` : ""}
    </section>`;
}

// Разбор координат "широта, долгота"
function parseCoords(str) {
  if (!str) return null;
  let parts = String(str).split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) parts = String(str).split(/\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// Источник карты: 1) свой embed-URL, 2) карта по координатам (своя метка наложением), 3) поиск по адресу
function mapSrc(loc = {}) {
  if (loc.mapUrl) return loc.mapUrl;
  const c = parseCoords(loc.coords);
  if (c) {
    // Центрируем карту на здании; красную метку рисуем сами поверх центра (overlay)
    return `https://yandex.ru/map-widget/v1/?ll=${c.lon},${c.lat}&z=17`;
  }
  if (loc.address) return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(loc.address)}&z=16`;
  return "";
}

// SVG красной метки-указателя (остриё внизу по центру)
const MAP_PIN_SVG =
  '<svg viewBox="0 0 24 36" width="32" height="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#e10a17"/>' +
  '<circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>';

function renderLocation(loc = {}) {
  const src = mapSrc(loc);
  if (!src && !loc.address) return "";
  // Своя красная метка только когда карта центрирована по координатам (без своего embed-URL)
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

function renderInvite(invite = {}) {
  return `
    <section class="invite" id="invite">
      <div class="invite__bg" style="background-image:url('${esc(imgUrl(invite.background))}')"></div>
      <div class="container invite__inner">
        <div class="invite__glass reveal">
          <p class="section-eyebrow">Присоединяйтесь</p>
          <h2 class="invite__title">Стань частью труппы</h2>
          <p class="invite__text">${esc(invite.text)}</p>
          <a href="${esc(invite.link)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Присоединиться</a>
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

  const social = [
    s.vk && `<a href="${esc(s.vk)}" target="_blank" rel="noopener" aria-label="VK"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5h-3c-.5 0-.7.3-.9.7-.6 1.3-1.6 3.1-2.4 3.1-.4 0-.5-.3-.5-.9V5.6c0-.4-.2-.6-.6-.6h-3.3c-.3 0-.5.2-.5.4 0 .5.6.6.7 1.7v2.4c0 .6-.1.7-.3.7-.7 0-1.9-1.9-2.6-4-.1-.4-.3-.6-.7-.6H3.6c-.4 0-.6.2-.6.5 0 .5 1 4.4 4.2 7.6 2 2 4.5 3 6.7 3 .5 0 .6-.2.6-.6v-1.7c0-.4.1-.6.4-.6.5 0 1.3 1.2 2.1 2.3.6.8.8.6 1.3.6h2.5c.4 0 .7-.2.5-.7-.2-.6-1.5-2.4-2.4-3.3-.2-.2-.1-.4 0-.5.7-.9 2.4-3.1 2.6-4 .1-.4 0-.6-.3-.6z"/></svg></a>`,
    s.telegram && `<a href="${esc(s.telegram)}" target="_blank" rel="noopener" aria-label="Telegram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3l-3.2 15c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L4.6 13.3l-4.8-1.5c-1-.3-1-1 .2-1.5l18.8-7.3c.9-.3 1.6.2 1.3 1.3z"/></svg></a>`,
    s.youtube && `<a href="${esc(s.youtube)}" target="_blank" rel="noopener" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5c-.2-1-.8-1.7-1.8-2C19.4 5 12 5 12 5s-7.4 0-9.2.5c-1 .3-1.6 1-1.8 2C.5 9.3.5 12 .5 12s0 2.7.5 4.5c.2 1 .8 1.7 1.8 2C4.6 19 12 19 12 19s7.4 0 9.2-.5c1-.3 1.6-1 1.8-2 .5-1.8.5-4.5.5-4.5s0-2.7-.5-4.5zM9.8 15.3V8.7l6.2 3.3-6.2 3.3z"/></svg></a>`
  ].filter(Boolean).join("");

  return `
    <div class="container">
      <div class="footer__grid">
        <div>
          <p class="footer__logo">${esc(name)}</p>
          <p class="footer__slogan">${esc(brand.tagline || "Мюзиклы в живом исполнении")}. Театрально-хоровой коллектив.</p>
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
   КАРУСЕЛЬ (со стрелками, миниатюрами, автопрокруткой, свайпом)
   ========================================================================== */
function initCarousel(root) {
  const track = $(".carousel__track", root);
  const slides = [...root.querySelectorAll(".carousel__slide")];
  if (slides.length <= 1) return;

  // Миниатюры могут лежать рядом с каруселью (общий родитель)
  const scope = root.parentElement || document;
  const thumbs = [...scope.querySelectorAll(".carousel__thumb")];

  let current = 0;
  let timer = null;

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    thumbs.forEach((t, idx) => t.classList.toggle("active", idx === current));
    restart();
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const nextBtn = $(".next", root);
  const prevBtn = $(".prev", root);
  if (nextBtn) nextBtn.addEventListener("click", next);
  if (prevBtn) prevBtn.addEventListener("click", prev);
  thumbs.forEach((t, i) => t.addEventListener("click", () => goTo(i)));

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
          ${p.ticketLink ? `<a href="${esc(p.ticketLink)}" class="btn btn-primary" target="_blank" rel="noopener">Купить билеты</a>` : ""}
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
            <button class="carousel__arrow prev" aria-label="Назад">‹</button>
            <button class="carousel__arrow next" aria-label="Вперёд">›</button>` : ""}
        </div>
        ${(p.gallery || []).length > 1 ? `<div class="carousel__thumbs">${thumbs}</div>` : ""}
      </div>` : ""}

      ${others ? `<div class="pd__block">
        <h3 class="pd__h3">Другие спектакли</h3>
        <div class="pd__others">${others}</div>
      </div>` : ""}
    </div>`;

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
    body = `<video controls autoplay playsinline>
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

  // Карусели на странице
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
    const bs = $("#bootScreen");
    if (bs) {
      bs.innerHTML = `Ошибка: ${esc(err.message)}.<br>Запустите бэкенд: <code>npm start</code>`;
      bs.classList.add("error");
    }
    return;
  }

  // SEO + бренд
  if (DB.seo?.title) document.title = DB.seo.title;
  if (DB.brand?.name) {
    const parts = DB.brand.name.split(" ");
    const logo = $("#logo");
    if (parts.length > 1) {
      const last = parts.pop();
      logo.innerHTML = `${esc(parts.join(" "))} <b>${esc(last)}</b>`;
    } else {
      logo.innerHTML = esc(DB.brand.name);
    }
  }

  // Рендер секций
  $("#app").innerHTML =
    renderHero(DB.hero) +
    renderAbout(DB.about) +
    renderLeaders(DB) +
    renderAfisha(DB.projects) +
    renderFeature(DB) +
    renderInvite(DB.choirInvite) +
    renderLocation(DB.location);

  $("#footer").innerHTML = renderFooter(DB);

  initUI();
}

boot();
