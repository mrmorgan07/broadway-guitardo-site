/**
 * v4 — статичный макет. Только UI: шапка, карусель, модалки, scroll-reveal.
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* --- Header scroll + burger --- */
const header = $("#header");
const nav = $("#nav");
const burger = $("#burger");

window.addEventListener("scroll", () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 40);
}, { passive: true });

burger?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
});

$$(".nav a").forEach((a) => {
  a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    burger?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  });
});

/* --- Scroll reveal --- */
const revealObs = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("is-visible");
      revealObs.unobserve(e.target);
    }
  }),
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);

$$(".reveal").forEach((el) => revealObs.observe(el));

/* --- Carousel --- */
$$("[data-carousel]").forEach((root) => {
  const track = $(".carousel__track", root);
  const slides = $$(".carousel__slide", root);
  const dotsWrap = $(".carousel__dots", root);
  if (!track || slides.length <= 1) return;

  let idx = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", `Слайд ${i + 1}`);
    dot.addEventListener("click", () => go(i));
    dotsWrap.appendChild(dot);
  });

  const dots = $$(".carousel__dot", dotsWrap);

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
  restart();
});

/* --- Demo modals --- */
const PROJECTS = {
  bal: {
    title: "Бал Вампиров",
    meta: "26 сентября 2026 · 2 ч 30 мин · 2 000 – 5 000 ₽",
    desc: "Мрачный и чувственный мюзикл о вечной любви и вечной ночи.",
    poster: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80"
  },
  prizrak: {
    title: "Призрак оперы",
    meta: "20 декабря 2026 · 2 ч 15 мин · 1 800 – 4 500 ₽",
    desc: "Легендарная история любви и одержимости в Парижской опере.",
    poster: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80"
  },
  notr: {
    title: "Нотр-Дам де Пари",
    meta: "14 февраля 2027 · 2 ч 45 мин · 2 200 – 5 500 ₽",
    desc: "Париж XV века: собор, страсть и судьбы героев.",
    poster: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80"
  },
  chicago: {
    title: "Чикаго",
    meta: "20 июня 2026 · 2 ч 20 мин · 1 500 – 4 000 ₽",
    desc: "Сатирическая история о коррупции и шоу-бизнесе 1920-х.",
    poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"
  }
};

const projectModal = $("#projectModal");
const trailerModal = $("#trailerModal");

$$("[data-project]").forEach((card) => {
  card.addEventListener("click", () => {
    const p = PROJECTS[card.dataset.project];
    if (!p || !projectModal) return;
    $("#modalTitle").textContent = p.title;
    $("#modalMeta").textContent = p.meta;
    $("#modalDesc").textContent = p.desc;
    $("#modalPoster").src = p.poster;
    projectModal.showModal();
    document.body.style.overflow = "hidden";
  });
});

$$("[data-open-trailer]").forEach((btn) => {
  btn.addEventListener("click", () => {
    trailerModal?.showModal();
    document.body.style.overflow = "hidden";
  });
});

$$("[data-close-project]").forEach((b) => b.addEventListener("click", () => closeModal(projectModal)));
$$("[data-close-trailer]").forEach((b) => b.addEventListener("click", () => closeModal(trailerModal)));

function closeModal(dialog) {
  dialog?.close();
  document.body.style.overflow = "";
}

projectModal?.addEventListener("click", (e) => {
  if (e.target === projectModal) closeModal(projectModal);
});
trailerModal?.addEventListener("click", (e) => {
  if (e.target === trailerModal) closeModal(trailerModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeModal(projectModal);
  closeModal(trailerModal);
});
