/**
 * ==========================================================================
 * ТЕАТРАЛЬНО-ХОРОВОЙ САЙТ — СКРИПТЫ
 * ==========================================================================
 * Как редактировать:
 * 1. PROJECTS — добавьте/измените спектакли в афише
 * 2. SOCIAL_LINKS — ссылки на соцсети
 * 3. SITE_CONTENT — тексты, контакты, команда, галерея
 * 4. VIDEO_TRAILER_URL — ссылка на YouTube/Vimeo трейлер
 * 5. HERO — заголовок и подзаголовок на главном экране
 * ==========================================================================
 */

// === ДАННЫЕ ДЛЯ ЗАМЕНЫ: ГЛАВНЫЙ ЭКРАН ===
const HERO = {
  title: "Бал Вампиров",
  subtitle: "15 ноября 2026, 19:00 — мюзикл, который не отпускает",
  eyebrow: "Ближайший показ"
};

// === ДАННЫЕ ДЛЯ ЗАМЕНЫ: ВИДЕО-ТРЕЙЛЕР ===
// Вставьте embed-URL YouTube или Vimeo, например:
// "https://www.youtube.com/embed/ВАШ_ID_ВИДЕО"
// "https://player.vimeo.com/video/ВАШ_ID"
const VIDEO_TRAILER_URL = "https://www.youtube.com/embed/ВАШ_ID_ВИДЕО";

// === ДАННЫЕ ДЛЯ ЗАМЕНЫ: ПРОЕКТЫ (АФИША) ===
const PROJECTS = [
  {
    id: 1,
    title: "Бал Вампиров",
    date: "15 ноября 2026, 19:00",
    tag: "Мюзикл в 2-х актах",
    // Замените на локальные файлы: "images/poster1.jpg"
    poster: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80",
    posterWebp: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&fm=webp&q=80",
    description:
      "Мрачный и чувственный мюзикл о вечной любви и вечной ночи. История Альфреда — молодого журналиста, попавшего в замок вампиров, — разворачивается под мощные хоровые партии и драматические арии. Постановка сочетает готическую эстетику, живой оркестр и хор из 40 голосов.",
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1514320291840-755e8373621f?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1514320291840-755e8373621f?w=800&fm=webp&q=80",
        alt: "Сцена из спектакля"
      },
      {
        src: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&fm=webp&q=80",
        alt: "Хор на сцене"
      },
      {
        src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&fm=webp&q=80",
        alt: "Свет и декорации"
      }
    ],
    soloists: [
      "Анна Смирнова — Сара",
      "Дмитрий Волков — Граф Кронин",
      "Елена Козлова — Магда",
      "Игорь Петров — Альфред"
    ],
    ticketLink: "https://ваша-ссылка-на-билеты"
  },
  {
    id: 2,
    title: "Призрак оперы",
    date: "20 декабря 2026, 18:30",
    tag: "Классический мюзикл",
    poster: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80",
    posterWebp: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&fm=webp&q=80",
    description:
      "Легендарная история любви, одержимости и музыки в Парижской опере. Наш хор создаёт атмосферу таинственности и величия, а солисты воплощают страсть и трагедию на сцене.",
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1501386761578-eac5c3b800fe?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1501386761578-eac5c3b800fe?w=800&fm=webp&q=80",
        alt: "Сцена оперы"
      },
      {
        src: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&fm=webp&q=80",
        alt: "Оркестр"
      },
      {
        src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&fm=webp&q=80",
        alt: "За кулисами"
      }
    ],
    soloists: [
      "Мария Иванова — Кристина",
      "Алексей Новиков — Призрак",
      "Ольга Белова — Карлотта"
    ],
    ticketLink: "https://ваша-ссылка-на-билеты-2"
  },
  {
    id: 3,
    title: "Нотр-Дам де Пари",
    date: "14 февраля 2027, 19:00",
    tag: "Эпический мюзикл",
    poster: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80",
    posterWebp: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&fm=webp&q=80",
    description:
      "Париж XV века: собор, страсть и судьбы героев, переплетённые в масштабной музыкальной драме. Хоровые номера создают ощущение эпохи и народного единства.",
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1524368535928-5b42e3da9a2b?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1524368535928-5b42e3da9a2b?w=800&fm=webp&q=80",
        alt: "Собор"
      },
      {
        src: "https://images.unsplash.com/photo-1415201364774-f6f0ff26b28?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1415201364774-f6f0ff26b28?w=800&fm=webp&q=80",
        alt: "Репетиция"
      },
      {
        src: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&fm=webp&q=80",
        alt: "Концерт"
      }
    ],
    soloists: [
      "Виктор Соколов — Квазимодо",
      "Татьяна Романова — Эсмеральда",
      "Павел Громов — Феб"
    ],
    ticketLink: "https://ваша-ссылка-на-билеты-3"
  },
  {
    id: 4,
    title: "Ромео и Джульетта",
    date: "8 марта 2027, 19:00",
    tag: "Мюзикл о любви",
    poster: "https://images.unsplash.com/photo-1507839077054-62b179cf029a?w=600&q=80",
    posterWebp: "https://images.unsplash.com/photo-1507839077054-62b179cf029a?w=600&fm=webp&q=80",
    description:
      "Вечная история двух влюблённых в современной сценической интерпретации. Динамичные хоровые сцены, страстные дуэты и трагический финал.",
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&fm=webp&q=80",
        alt: "Бал"
      },
      {
        src: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4de?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4de?w=800&fm=webp&q=80",
        alt: "Дуэт"
      },
      {
        src: "https://images.unsplash.com/photo-1498038432885-6f410460e4df?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1498038432885-6f410460e4df?w=800&fm=webp&q=80",
        alt: "Финал"
      }
    ],
    soloists: [
      "Ксения Лебедева — Джульетта",
      "Артём Морозов — Ромео",
      "Наталья Орлова — Леди Капулетти"
    ],
    ticketLink: "https://ваша-ссылка-на-билеты-4"
  },
  {
    id: 5,
    title: "Отверженные",
    date: "25 апреля 2027, 19:00",
    tag: "Эпическая драма",
    poster: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80",
    posterWebp: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&fm=webp&q=80",
    description:
      "История Жан Вальжана — от беглеца до героя — в масштабной музыкальной постановке. Хор из 50 голосов создаёт эффект народного хора и революционного пафоса, а солисты раскрывают внутренний мир каждого персонажа.",
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&fm=webp&q=80",
        alt: "Сцена баррикад"
      },
      {
        src: "https://images.unsplash.com/photo-1524368535928-5b42e3da9a2b?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1524368535928-5b42e3da9a2b?w=800&fm=webp&q=80",
        alt: "Хоровая сцена"
      },
      {
        src: "https://images.unsplash.com/photo-1415201364774-f6f0ff26b28?w=800&q=80",
        webp: "https://images.unsplash.com/photo-1415201364774-f6f0ff26b28?w=800&fm=webp&q=80",
        alt: "Репетиция"
      }
    ],
    soloists: [
      "Сергей Ковалёв — Жан Вальжан",
      "Алина Фролова — Фантина",
      "Михаил Зайцев — Жаверт"
    ],
    ticketLink: "https://ваша-ссылка-на-билеты-5"
  }
];

// === ДАННЫЕ ДЛЯ ЗАМЕНЫ: СОЦСЕТИ ===
const SOCIAL_LINKS = {
  vk: "https://vk.com/ваша_группа",
  telegram: "https://t.me/ваш_канал",
  youtube: "https://youtube.com/ваш_канал"
};

// === ДАННЫЕ ДЛЯ ЗАМЕНЫ: ТЕКСТЫ И КОНТАКТЫ ===
const SITE_CONTENT = {
  about:
    "Мы — хор, который превращает мюзиклы в живую магию. Каждый наш проект — от первой ноты до финальных оваций — создаётся в дружной команде профессионалов и любителей. Наши постановки — это синтез мощного вокала, драматической игры и сценического волшебства.",

  gallery: [
    {
      caption: "Репетиция",
      src: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80",
      webp: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&fm=webp&q=80",
      alt: "Репетиция хора"
    },
    {
      caption: "Спектакль",
      src: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80",
      webp: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&fm=webp&q=80",
      alt: "Выступление на сцене"
    },
    {
      caption: "За кулисами",
      src: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
      webp: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&fm=webp&q=80",
      alt: "За кулисами"
    }
  ],

  team: [
    {
      name: "Екатерина Воронова",
      role: "Художественный руководитель",
      bio: "Более 15 лет руководит хоровыми коллективами и ставит мюзиклы. Выпускница Московской консерватории, лауреат всероссийских конкурсов хоровых дирижёров. Верит, что каждый голос может стать частью большого искусства.",
      awards: "Лауреат премии «Золотая маска» (номинация), руководитель 12 постановок",
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
      photoWebp: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&fm=webp&q=80"
    },
    {
      name: "Андрей Мельников",
      role: "Концертмейстер",
      bio: "Пианист и аранжировщик с опытом работы в театральных постановках. Сопровождает репетиции, работает с вокалистами над партиями и создаёт оркестровки для хоровых номеров.",
      awards: "Солист Московской филармонии, автор аранжировок для 8 мюзиклов",
      photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80",
      photoWebp: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&fm=webp&q=80"
    }
  ],

  recruitment:
    "Хочешь петь на одной сцене с солистами и участвовать в создании мюзиклов? Мы ищем голоса. Приходи — у нас дружная семья, и мы научим всему. Главное — твоя любовь к музыке!",

  recruitmentLink: "https://guitardo.ru/ваша-ссылка",

  contacts: {
    email: "info@example.com",
    phone: "+79000000000",
    phoneDisplay: "+7 (900) 000-00-00"
  }
};

/* ==========================================================================
   ИНИЦИАЛИЗАЦИЯ КОНТЕНТА
   ========================================================================== */

function createPicture(webp, src, alt, className) {
  const picture = document.createElement("picture");
  if (className) picture.className = className;

  const source = document.createElement("source");
  source.srcset = webp;
  source.type = "image/webp";

  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";

  picture.append(source, img);
  return picture;
}

function initHero() {
  const eyebrow = document.querySelector(".hero-eyebrow");
  const title = document.getElementById("heroTitle");
  const subtitle = document.getElementById("heroSubtitle");

  if (eyebrow) eyebrow.textContent = HERO.eyebrow;
  if (title) title.textContent = HERO.title;
  if (subtitle) subtitle.textContent = HERO.subtitle;
}

function initAbout() {
  const aboutText = document.getElementById("aboutText");
  const gallery = document.getElementById("aboutGallery");

  if (aboutText) aboutText.textContent = SITE_CONTENT.about;

  if (gallery) {
    gallery.innerHTML = "";
    SITE_CONTENT.gallery.forEach((item) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-item reveal";

      const picture = createPicture(item.webp, item.src, item.alt);
      figure.appendChild(picture);

      const caption = document.createElement("figcaption");
      caption.className = "gallery-caption";
      caption.textContent = item.caption;
      figure.appendChild(caption);

      gallery.appendChild(figure);
    });
  }
}

function initTeam() {
  const teamGrid = document.getElementById("teamGrid");
  if (!teamGrid) return;

  teamGrid.innerHTML = "";
  SITE_CONTENT.team.forEach((member) => {
    const card = document.createElement("article");
    card.className = "team-card glass-card reveal";

    card.innerHTML = `
      <div class="team-photo"></div>
      <div class="team-info">
        <h3>${member.name}</h3>
        <p class="team-role">${member.role}</p>
        <p class="team-bio">${member.bio}</p>
        <div class="team-awards">
          <strong>Регалии и достижения</strong>
          ${member.awards}
        </div>
      </div>
    `;

    const photoWrap = card.querySelector(".team-photo");
    photoWrap.appendChild(createPicture(member.photoWebp, member.photo, member.name));

    teamGrid.appendChild(card);
  });
}

function renderProjectCard(project) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "project-card glass-card reveal";
  card.setAttribute("role", "listitem");
  card.dataset.projectId = String(project.id);
  card.setAttribute("aria-label", `Подробнее о спектакле «${project.title}»`);

  card.innerHTML = `
    <div class="project-poster">
      <span class="project-tag">${project.tag}</span>
    </div>
    <div class="project-info">
      <h3>${project.title}</h3>
      <p class="project-date">${project.date}</p>
      <p class="project-hint">Нажмите для подробностей →</p>
    </div>
  `;

  const poster = card.querySelector(".project-poster");
  poster.appendChild(
    createPicture(project.posterWebp, project.poster, `Постер: ${project.title}`)
  );

  card.addEventListener("click", () => openProjectModal(project.id));
  return card;
}

function initProjects() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  PROJECTS.forEach((project) => {
    grid.appendChild(renderProjectCard(project));
  });

  initCurrentProjectHighlight();
}

function initCurrentProjectHighlight() {
  const container = document.getElementById("currentProjectHighlight");
  const project = PROJECTS[0];
  if (!container || !project) return;

  container.innerHTML = `
    <div class="project-highlight-poster"></div>
    <div>
      <h3>${project.title}</h3>
      <p class="project-date">${project.date} · ${project.tag}</p>
      <p>${project.description}</p>
      <a href="${project.ticketLink}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Купить билеты</a>
    </div>
  `;

  const posterWrap = container.querySelector(".project-highlight-poster");
  posterWrap.appendChild(
    createPicture(project.posterWebp, project.poster, project.title)
  );
}

function openProjectModal(projectId) {
  const project = PROJECTS.find((p) => p.id === projectId);
  const modal = document.getElementById("projectModal");
  const body = document.getElementById("modalBody");
  if (!project || !modal || !body) return;

  const galleryHtml = project.gallery
    .map(
      (img) => `
      <picture>
        <source srcset="${img.webp}" type="image/webp">
        <img src="${img.src}" alt="${img.alt}" loading="lazy">
      </picture>
    `
    )
    .join("");

  const soloistsHtml = project.soloists.map((s) => `<li>${s}</li>`).join("");

  body.innerHTML = `
    <picture>
      <source srcset="${project.posterWebp}" type="image/webp">
      <img class="modal-poster" src="${project.poster}" alt="Постер: ${project.title}">
    </picture>
    <h2 id="modalTitle">${project.title}</h2>
    <p class="modal-meta">${project.date} · ${project.tag}</p>
    <p class="modal-description">${project.description}</p>
    <div class="modal-gallery" aria-label="Фотографии со сцены">${galleryHtml}</div>
    <div class="modal-soloists">
      <h4>Солисты</h4>
      <ul>${soloistsHtml}</ul>
    </div>
    <a href="${project.ticketLink}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Купить билеты</a>
  `;

  modal.showModal();
  document.body.style.overflow = "hidden";
}

function closeProjectModal() {
  const modal = document.getElementById("projectModal");
  if (modal?.open) {
    modal.close();
    document.body.style.overflow = "";
  }
}

function initContacts() {
  const email = document.getElementById("contactEmail");
  const phone = document.getElementById("contactPhone");
  const recruitmentText = document.getElementById("recruitmentText");
  const recruitmentBtn = document.getElementById("recruitmentBtn");
  const year = document.getElementById("copyrightYear");

  if (email) {
    email.href = `mailto:${SITE_CONTENT.contacts.email}`;
    email.textContent = SITE_CONTENT.contacts.email;
  }
  if (phone) {
    phone.href = `tel:${SITE_CONTENT.contacts.phone}`;
    phone.textContent = SITE_CONTENT.contacts.phoneDisplay;
  }
  if (recruitmentText) recruitmentText.textContent = SITE_CONTENT.recruitment;
  if (recruitmentBtn) recruitmentBtn.href = SITE_CONTENT.recruitmentLink;
  if (year) year.textContent = new Date().getFullYear();
}

function initSocialLinks() {
  const container = document.getElementById("socialLinks");
  if (!container) return;

  const icons = {
    vk: {
      label: "ВКонтакте",
      svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.08 14.27h-1.46c-.55 0-.72-.44-1.71-1.42-.86-.82-1.24-.93-1.45-.93-.3 0-.38.09-.38.5v1.3c0 .36-.12.58-1.08.58-1.59 0-3.36-.96-4.6-2.75-1.87-2.58-2.38-4.52-2.38-4.65 0-.2.09-.39.5-.39h1.46c.37 0 .51.17.65.57.7 2.05 1.88 3.85 2.36 3.85.18 0 .27-.09.27-.55V9.58c-.06-.99-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.3c.31 0 .42.17.42.54v2.89c0 .31.14.42.23.42.18 0 .33-.11.65-.43 1.01-1.13 1.73-2.87 1.73-2.87.1-.2.26-.39.63-.39h1.46c.44 0 .53.23.44.54-.18.86-1.93 3.26-1.93 3.26-.15.25-.21.36 0 .65.15.21.66.64 1 1.04.62.74 1.1 1.36 1.23 1.79.14.44-.08.66-.52.66z"/></svg>`
    },
    telegram: {
      label: "Telegram",
      svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>`
    },
    youtube: {
      label: "YouTube",
      svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.3 31.3 0 000 12a31.3 31.3 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.3 31.3 0 0024 12a31.3 31.3 0 00-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>`
    }
  };

  container.innerHTML = "";
  Object.entries(SOCIAL_LINKS).forEach(([key, url]) => {
    if (!icons[key]) return;
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

/* ==========================================================================
   ИНТЕРАКТИВНОСТЬ
   ========================================================================== */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileNav();
    });
  });
}

function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");

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

  reveals.forEach((el) => observer.observe(el));
}

function initBurgerMenu() {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("mainNav");

  if (!burger || !nav) return;

  burger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    burger.classList.toggle("is-active", isOpen);
    burger.setAttribute("aria-expanded", String(isOpen));
    burger.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });
}

function closeMobileNav() {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("mainNav");
  if (!burger || !nav) return;

  nav.classList.remove("is-open");
  burger.classList.remove("is-active");
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-label", "Открыть меню");
  if (!document.getElementById("projectModal")?.open) {
    document.body.style.overflow = "";
  }
}

function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  const header = document.querySelector(".site-header");
  if (!btn) return;

  window.addEventListener(
    "scroll",
    () => {
      const scrolled = window.scrollY > 300;
      btn.classList.toggle("is-visible", scrolled);
      header?.classList.toggle("is-scrolled", window.scrollY > 50);
    },
    { passive: true }
  );

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initModals() {
  const projectModal = document.getElementById("projectModal");
  const modalClose = document.getElementById("modalClose");
  const videoModal = document.getElementById("videoModal");
  const videoModalClose = document.getElementById("videoModalClose");
  const heroPlayBtn = document.getElementById("heroPlayBtn");

  modalClose?.addEventListener("click", closeProjectModal);

  projectModal?.addEventListener("click", (e) => {
    const rect = projectModal.querySelector(".modal-inner")?.getBoundingClientRect();
    if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
      closeProjectModal();
    }
  });

  projectModal?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeProjectModal();
  });

  heroPlayBtn?.addEventListener("click", () => {
    const embed = document.getElementById("videoEmbed");
    if (!embed || !videoModal) return;

    embed.innerHTML = `
      <iframe
        src="${VIDEO_TRAILER_URL}?autoplay=1"
        title="Трейлер спектакля"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy">
      </iframe>
    `;

    videoModal.showModal();
    document.body.style.overflow = "hidden";
  });

  function closeVideoModal() {
    const embed = document.getElementById("videoEmbed");
    if (embed) embed.innerHTML = "";
    videoModal?.close();
    if (!projectModal?.open) {
      document.body.style.overflow = "";
    }
  }

  videoModalClose?.addEventListener("click", closeVideoModal);

  videoModal?.addEventListener("click", (e) => {
    if (e.target === videoModal) closeVideoModal();
  });

  videoModal?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeVideoModal();
  });
}

/* ==========================================================================
   ЗАПУСК
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initHero();
  initAbout();
  initTeam();
  initProjects();
  initContacts();
  initSocialLinks();
  initSmoothScroll();
  initScrollReveal();
  initBurgerMenu();
  initScrollTop();
  initModals();
});
