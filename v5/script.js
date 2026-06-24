/* ==========================================================================
   BROADWAY GUITARDO — v5 «Афиша» + живые данные из /api/content
   Оригинальные приложения "/", "/v2", "/v3", "/v4" не затрагиваются.
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

function videoType(url) {
  if (url.endsWith(".webm")) return "video/webm";
  if (url.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

function telHref(phone) {
  return (phone || "").replace(/[^\d+]/g, "");
}

function formatPrice(from, to) {
  const f = from !== "" && from != null ? Number(from) : NaN;
  const t = to !== "" && to != null ? Number(to) : NaN;
  const hasF = Number.isFinite(f);
  const hasT = Number.isFinite(t);
  if (!hasF && !hasT) return "";
  const num = (n) => n.toLocaleString("ru-RU");
  const rub = (n) => num(n) + " ₽";
  if (hasF && hasT) return f === t ? rub(f) : `${num(f)} – ${rub(t)}`;
  if (hasF) return `от ${rub(f)}`;
  return `до ${rub(t)}`;
}

// "Длительность · цена" одной строкой
function metaLine(p = {}) {
  return [p.duration, formatPrice(p.priceFrom, p.priceTo)].filter(Boolean).join(" · ");
}

// Солист → {name, role, photo} (строки "Имя — Роль" и объекты)
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

// Заголовок постера: последнее слово — курсивный винный акцент на новой строке
function posterTitle(title) {
  const t = (title || "").trim();
  const parts = t.split(/\s+/);
  if (parts.length < 2) return `<span class="poster__title-em">${esc(t)}</span>`;
  const last = parts.pop();
  return `${esc(parts.join(" "))}<br><span class="poster__title-em">${esc(last)}</span>`;
}

// Логотип: последнее слово курсивом
function brandLogo(name) {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length < 2) return esc(name || "Broadway Guitardo");
  const last = parts.pop();
  return `${esc(parts.join(" "))} <em>${esc(last)}</em>`;
}

// "26 сентября 2026, 19:00" → { date, time }
function splitDate(date) {
  const d = (date || "").trim();
  const idx = d.lastIndexOf(",");
  if (idx === -1) return { date: d, time: "" };
  return { date: d.slice(0, idx).trim(), time: d.slice(idx + 1).trim() };
}

// Хвост подзаголовка после тире (как слоган)
function tagline(subtitle) {
  const s = (subtitle || "").trim();
  const m = s.split(/\s+[—–-]\s+/);
  return (m.length > 1 ? m.slice(1).join(" — ") : s).trim();
}

const QUOTE_DEFAULT = "Магия рождается из полумрака";

/* --- Состояние --- */
let DB = null;

// Текущий «спектакль сезона»: по hero.title, иначе первый
function featuredProject(db) {
  const projects = db.projects || [];
  if (!projects.length) return null;
  const heroTitle = (db.hero?.title || "").trim().toLowerCase();
  return projects.find((x) => (x.title || "").trim().toLowerCase() === heroTitle) || projects[0];
}

/* ==========================================================================
   РЕНДЕР СЕКЦИЙ
   ========================================================================== */

function renderMarquee(db) {
  const titles = (db.projects || []).map((p) => p.title).filter(Boolean);
  const season = `Сезон ${new Date().getFullYear()} / ${(new Date().getFullYear() + 1) % 100}`;
  const items = [season, ...titles, "Живой хор из 40 голосов"];
  const line = items.map((t) => esc(t)).join(" ✦ ") + " ✦ ";
  return `<span>${line}</span><span>${line}</span>`;
}

function renderHero(db) {
  const hero = db.hero || {};
  const p = featuredProject(db) || {};
  const { date, time } = splitDate(p.date || "");
  const price = formatPrice(p.priceFrom, p.priceTo);
  const hasTrailer = !!(hero.trailerFile || hero.videoTrailerUrl);

  const metaCells = [
    date && `<div><span class="poster__meta-k">Дата</span><span class="poster__meta-v">${esc(date)}</span></div>`,
    time && `<div><span class="poster__meta-k">Начало</span><span class="poster__meta-v">${esc(time)}</span></div>`,
    p.duration && `<div><span class="poster__meta-k">Длительность</span><span class="poster__meta-v">${esc(p.duration)}</span></div>`,
    price && `<div><span class="poster__meta-k">Билеты</span><span class="poster__meta-v">${esc(price)}</span></div>`
  ].filter(Boolean).join("");

  return `
    <section class="hero" id="hero">
      <div class="container">
        <div class="poster reveal">
          <div class="poster__frame">
            <div class="poster__top">
              <span>${esc(db.brand?.tagline || "Театрально-хоровой коллектив")}</span>
              <span>Москва · ${new Date().getFullYear()}</span>
            </div>

            <p class="poster__eyebrow">${esc(hero.eyebrow || "Премьера сезона")}</p>
            <h1 class="poster__title">${posterTitle(hero.title)}</h1>
            <p class="poster__tagline">${esc(tagline(hero.subtitle))}</p>

            <div class="poster__stars" aria-hidden="true">✦ ✦ ✦</div>

            ${metaCells ? `<div class="poster__meta">${metaCells}</div>` : ""}

            <div class="poster__actions">
              <a href="${esc(p.ticketLink || "#afisha")}" class="btn btn--solid btn--lg"${p.ticketLink ? ' target="_blank" rel="noopener"' : ""}>Купить билеты</a>
              ${hasTrailer ? `<button type="button" class="btn btn--outline btn--lg" data-open-trailer>▷ Трейлер</button>` : ""}
            </div>
          </div>

          <aside class="ticket reveal d1">
            <div class="ticket__perf" aria-hidden="true"></div>
            <p class="ticket__label">Admit One</p>
            <p class="ticket__show">${esc(hero.title)}</p>
            <p class="ticket__row">Ряд 7 · Место 12</p>
            <div class="ticket__barcode" aria-hidden="true"></div>
            <p class="ticket__no">№ 00 · ${esc(date || "2026")}</p>
          </aside>
        </div>
      </div>
    </section>`;
}

function renderAbout(db) {
  const about = db.about || {};
  const photos = about.photos || [];
  const captions = about.captions || [];
  const quote = about.quote || QUOTE_DEFAULT;

  // Первое предложение — лид, остальное — абзац
  const text = (about.text || "").trim();
  const dot = text.indexOf(". ");
  const lede = dot > -1 ? text.slice(0, dot + 1) : text;
  const rest = dot > -1 ? text.slice(dot + 1).trim() : "";

  const slides = photos.map((src, i) => `
    <div class="carousel__slide"><img src="${esc(imgUrl(src))}" alt="${esc(captions[i] || "О коллективе")}" loading="lazy"></div>`).join("");

  const photoBlock = photos.length
    ? `<figure class="about__photo reveal d1">
         <div class="carousel" data-carousel>
           <div class="carousel__track">${slides}</div>
           ${photos.length > 1 ? `
             <button class="carousel__btn prev" aria-label="Назад">‹</button>
             <button class="carousel__btn next" aria-label="Вперёд">›</button>
             <div class="carousel__dots"></div>` : ""}
         </div>
         <figcaption>«${esc(quote)}»</figcaption>
       </figure>`
    : "";

  return `
    <section class="section" id="about">
      <div class="container">
        <div class="act-head reveal">
          <span class="act-num">Акт I</span>
          <h2 class="section-title">О коллективе</h2>
          <span class="act-rule" aria-hidden="true"></span>
        </div>
        <div class="about">
          <div class="about__text reveal">
            ${lede ? `<p class="lede">${esc(lede)}</p>` : ""}
            ${rest ? `<p>${esc(rest)}</p>` : ""}
            <div class="figures">
              <div class="figure"><strong>40+</strong><span>голосов в хоре</span></div>
              <div class="figure"><strong>${(db.projects || []).length || 12}</strong><span>спектаклей</span></div>
              <div class="figure"><strong>15</strong><span>лет на сцене</span></div>
            </div>
          </div>
          ${photoBlock}
        </div>
      </div>
    </section>`;
}

function leaderCard(person = {}, role, rev, delay) {
  if (!person.name) return "";
  return `
    <article class="leader${rev ? " leader--rev" : ""} reveal ${delay}">
      <div class="leader__photo"><img src="${esc(imgUrl(person.photo))}" alt="${esc(person.name)}" loading="lazy"></div>
      <div class="leader__info">
        <h3>${esc(person.name)}</h3>
        <p class="leader__role">${esc(role)}</p>
        <p>${esc(person.bio)}</p>
      </div>
    </article>`;
}

function renderLeaders(db) {
  return `
    <section class="section section--paper-dark" id="leaders">
      <div class="container">
        <div class="act-head reveal">
          <span class="act-num">Акт II</span>
          <h2 class="section-title">Команда</h2>
          <span class="act-rule" aria-hidden="true"></span>
        </div>
        <div class="leaders">
          ${leaderCard(db.artisticDirector, "Художественный руководитель", false, "")}
          ${leaderCard(db.concertmaster, "Концертмейстер", true, "d1")}
        </div>
      </div>
    </section>`;
}

function renderAfisha(db) {
  const projects = db.projects || [];
  if (!projects.length) return "";
  const featId = (featuredProject(db) || {}).id;

  const cards = projects.map((p, i) => `
    <article class="show reveal ${["", "d1", "d2"][i % 3]}" data-project="${esc(p.id)}">
      <div class="show__img"><img src="${esc(imgUrl(p.poster))}" alt="${esc(p.title)}" loading="lazy"></div>
      <div class="show__body">
        ${p.id === featId ? `<span class="show__badge">Премьера</span>` : ""}
        <h3>${esc(p.title)}</h3>
        <p class="show__date">${esc(p.date)}</p>
        ${metaLine(p) ? `<p class="show__price">${esc(metaLine(p))}</p>` : ""}
        <span class="link-arrow">Подробнее</span>
      </div>
    </article>`).join("");

  return `
    <section class="section" id="afisha">
      <div class="container">
        <div class="act-head reveal">
          <span class="act-num">Репертуар</span>
          <h2 class="section-title">Афиша сезона</h2>
          <span class="act-rule" aria-hidden="true"></span>
        </div>
        <div class="playbill">${cards}</div>
      </div>
    </section>`;
}

function castItem(s) {
  const { name, role, photo } = parseSoloist(s);
  const media = photo
    ? `<img src="${esc(imgUrl(photo))}" alt="${esc(name)}" loading="lazy">`
    : `<span class="cast__mono">${esc(monogram(name))}</span>`;
  return `
    <figure class="cast__item">
      ${media}
      <figcaption><strong>${esc(name)}</strong>${role ? `<span>${esc(role)}</span>` : ""}</figcaption>
    </figure>`;
}

function renderFeature(db) {
  const p = featuredProject(db);
  if (!p) return "";
  const poster = (p.gallery && p.gallery[0]) || p.poster;
  const cast = (p.soloists || []).map(castItem).join("");
  const price = formatPrice(p.priceFrom, p.priceTo);

  const meta = [
    p.tag && `<div><dt>Формат</dt><dd>${esc(p.tag)}</dd></div>`,
    p.duration && `<div><dt>Длительность</dt><dd>${esc(p.duration)}</dd></div>`,
    price && `<div><dt>Стоимость</dt><dd>${esc(price)}</dd></div>`
  ].filter(Boolean).join("");

  return `
    <section class="feature" id="feature">
      <div class="container feature__inner">
        <div class="feature__poster reveal">
          <img src="${esc(imgUrl(poster))}" alt="${esc(p.title)}" loading="lazy">
          <span class="feature__tag">Спектакль сезона</span>
        </div>
        <div class="feature__body reveal d1">
          <h2 class="feature__title">${esc(p.title)}</h2>
          <p class="feature__text">${esc(p.description)}</p>
          ${meta ? `<dl class="feature__meta">${meta}</dl>` : ""}
          ${cast ? `<p class="feature__cast-label">В ролях</p><div class="cast">${cast}</div>` : ""}
          ${p.ticketLink ? `<a href="${esc(p.ticketLink)}" class="btn btn--solid btn--lg" target="_blank" rel="noopener">Купить билеты</a>` : ""}
        </div>
      </div>
    </section>`;
}

function renderInvite(db) {
  const invite = db.choirInvite || {};
  if (!invite.text) return "";
  return `
    <section class="invite" id="invite">
      <div class="container invite__inner reveal">
        <span class="invite__star" aria-hidden="true">✦</span>
        <h2 class="invite__title">Стань частью труппы</h2>
        <p class="invite__text">${esc(invite.text)}</p>
        ${invite.link ? `<a href="${esc(invite.link)}" class="btn btn--solid btn--lg" target="_blank" rel="noopener">Присоединиться</a>` : ""}
      </div>
    </section>`;
}

/* --- Карта (как в v3): координаты → красная метка наложением --- */
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
  '<svg viewBox="0 0 24 36" width="30" height="45" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#7B1E2B"/>' +
  '<circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>';

function renderLocation(db) {
  const loc = db.location || {};
  const src = mapSrc(loc);
  if (!src && !loc.address) return "";
  const showPin = !loc.mapUrl && !!parseCoords(loc.coords);
  return `
    <section class="section" id="location">
      <div class="container">
        <div class="act-head reveal">
          <span class="act-num">Финал</span>
          <h2 class="section-title">${esc(loc.title || "Как добраться")}</h2>
          <span class="act-rule" aria-hidden="true"></span>
        </div>
        <div class="location">
          <div class="location__info reveal">
            ${loc.address ? `<p class="location__address">${esc(loc.address)}</p>` : ""}
            ${loc.note ? `<p class="location__note">${esc(loc.note)}</p>` : ""}
            <ul class="location__list">
              <li>Гардероб открывается за час до показа</li>
              <li>Вход по электронным билетам</li>
              <li>Буфет работает в антракте</li>
            </ul>
          </div>
          <div class="location__map reveal d1">
            ${src ? `<iframe src="${esc(src)}" width="100%" height="100%" frameborder="0" allowfullscreen="true" loading="lazy" title="Карта проезда"></iframe>` : ""}
            ${showPin ? `<span class="location__pin" aria-hidden="true">${MAP_PIN_SVG}</span>` : ""}
          </div>
        </div>
      </div>
    </section>`;
}

function renderFooter(db) {
  const c = db.contacts || {};
  const s = c.social || {};
  const brand = db.brand || {};
  const name = brand.name || "Broadway Guitardo";
  const year = new Date().getFullYear();

  const socials = [
    s.vk && `<a href="${esc(s.vk)}" target="_blank" rel="noopener">VK</a>`,
    s.telegram && `<a href="${esc(s.telegram)}" target="_blank" rel="noopener">Telegram</a>`,
    s.youtube && `<a href="${esc(s.youtube)}" target="_blank" rel="noopener">YouTube</a>`
  ].filter(Boolean).join("");

  return `
    <div class="container">
      <div class="footer__top">
        <a href="#hero" class="logo logo--lg">
          <span class="logo__star">✦</span>
          <span class="logo__text">${brandLogo(name)}</span>
        </a>
        <p class="footer__tagline">${esc(brand.tagline || "Мюзиклы в живом исполнении")}</p>
      </div>
      <div class="footer__grid">
        <div>
          <h4>Навигация</h4>
          <ul>
            <li><a href="#about">О коллективе</a></li>
            <li><a href="#afisha">Афиша</a></li>
            <li><a href="#invite">В хор</a></li>
          </ul>
        </div>
        <div>
          <h4>Контакты</h4>
          <ul>
            ${c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ""}
            ${c.phone ? `<li><a href="tel:${esc(telHref(c.phone))}">${esc(c.phone)}</a></li>` : ""}
          </ul>
        </div>
        <div>
          <h4>Соцсети</h4>
          <div class="socials">${socials}</div>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© ${year} ${esc(name)}</span>
        <a href="/admin">Админ</a>
      </div>
    </div>`;
}

/* ==========================================================================
   КАРУСЕЛЬ
   ========================================================================== */
function initCarousel(root) {
  const track = $(".carousel__track", root);
  const slides = $$(".carousel__slide", root);
  const dotsWrap = $(".carousel__dots", root);
  if (!track || slides.length <= 1) return;

  let idx = 0;
  let timer;

  if (dotsWrap) {
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Слайд ${i + 1}`);
      dot.addEventListener("click", () => go(i));
      dotsWrap.appendChild(dot);
    });
  }
  const dots = dotsWrap ? $$(".carousel__dot", dotsWrap) : [];

  function go(i) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, n) => d.classList.toggle("is-active", n === idx));
    restart();
  }
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  $(".carousel__btn.next", root)?.addEventListener("click", next);
  $(".carousel__btn.prev", root)?.addEventListener("click", prev);

  const restart = () => { clearInterval(timer); timer = setInterval(next, 5500); };
  root.addEventListener("mouseenter", () => clearInterval(timer));
  root.addEventListener("mouseleave", restart);

  let startX = 0;
  root.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  root.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
  });

  restart();
}

/* ==========================================================================
   МОДАЛКИ
   ========================================================================== */
function openProject(id) {
  const p = (DB.projects || []).find((x) => x.id === id);
  const modal = $("#projectModal");
  if (!p || !modal) return;

  const meta = [p.date, p.duration, formatPrice(p.priceFrom, p.priceTo)].filter(Boolean).join(" · ");
  $("#mPoster").src = imgUrl((p.gallery && p.gallery[0]) || p.poster);
  $("#mPoster").alt = p.title || "";
  $("#mTitle").textContent = p.title || "";
  $("#mMeta").textContent = meta;
  $("#mDesc").textContent = p.description || "";

  const buy = $("#mBuy");
  if (p.ticketLink) {
    buy.href = p.ticketLink;
    buy.style.display = "";
  } else {
    buy.style.display = "none";
  }

  modal.showModal();
  document.body.style.overflow = "hidden";
}

function openTrailer() {
  const hero = DB.hero || {};
  const box = $("#trailerBody");
  if (hero.trailerFile) {
    const url = imgUrl(hero.trailerFile);
    box.innerHTML = `<video controls autoplay playsinline style="width:100%;height:100%"><source src="${esc(url)}" type="${videoType(url)}"></video>`;
  } else if (hero.videoTrailerUrl) {
    box.innerHTML = `<iframe src="${esc(hero.videoTrailerUrl)}?autoplay=1" title="Трейлер" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`;
  } else {
    box.innerHTML = `<p>Трейлер скоро появится</p>`;
  }
  $("#trailerModal").showModal();
  document.body.style.overflow = "hidden";
}

function closeModal(dialog) {
  if (!dialog) return;
  dialog.close();
  document.body.style.overflow = "";
  if (dialog.id === "trailerModal") $("#trailerBody").innerHTML = "";
}

/* ==========================================================================
   ВЗАИМОДЕЙСТВИЯ
   ========================================================================== */
function initUI() {
  const header = $("#header");
  const nav = $("#nav");
  const burger = $("#burger");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    })
  );

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); observer.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => observer.observe(el));

  $$("[data-carousel]").forEach(initCarousel);

  document.addEventListener("click", (e) => {
    const proj = e.target.closest("[data-project]");
    if (proj) { e.preventDefault(); openProject(proj.dataset.project); return; }
    if (e.target.closest("[data-open-trailer]")) { openTrailer(); return; }
    if (e.target.closest("[data-close-project]")) { closeModal($("#projectModal")); return; }
    if (e.target.closest("[data-close-trailer]")) { closeModal($("#trailerModal")); return; }
  });

  [$("#projectModal"), $("#trailerModal")].forEach((m) => {
    m?.addEventListener("click", (e) => { if (e.target === m) closeModal(m); });
    m?.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(m); });
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

  if (DB.seo?.title) document.title = DB.seo.title;
  if (DB.brand?.name) $("#logo .logo__text").innerHTML = brandLogo(DB.brand.name);

  $("#marqueeTrack").innerHTML = renderMarquee(DB);

  $("#app").innerHTML =
    renderHero(DB) +
    renderAbout(DB) +
    renderLeaders(DB) +
    renderAfisha(DB) +
    renderFeature(DB) +
    renderInvite(DB) +
    renderLocation(DB);

  $("#footer").innerHTML = renderFooter(DB);

  initUI();
}

boot();
