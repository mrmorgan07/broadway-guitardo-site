/**
 * ==========================================================================
 * БЭКЕНД — Express REST API
 * ==========================================================================
 * Данные: backend/data/db.json
 * Авторизация: backend/data/auth.json (логин admin / пароль 12345 по умолчанию)
 * Загрузки: backend/uploads/
 *
 * Запуск из корня проекта: npm start
 * ==========================================================================
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const THUMBS_DIR = path.join(UPLOADS_DIR, "thumbs");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");
const CLIENT_DIST = path.join(ROOT, "client", "dist");
const ADMIN_DIR = path.join(ROOT, "frontend", "admin");
const V2_DIR = path.join(ROOT, "v2");
const V3_DIR = path.join(ROOT, "v3");
const V4_DIR = path.join(ROOT, "v4");
const V5_DIR = path.join(ROOT, "v5");
const RED_DRAFT_DIR = path.join(ROOT, "red_draft");

// Допустимые MIME для изображений и видео
const IMAGE_MIMES = /^image\/(jpeg|png|gif|webp|avif)$/i;
const VIDEO_MIMES = /^video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska)$/i;
const VIDEO_EXTS = /\.(mp4|webm|ogv|mov|avi|mkv)$/i;

// Максимальный размер видео: 500 МБ
const VIDEO_MAX_MB = 500;

const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const app = express();
const sessions = new Map();

[UPLOADS_DIR, THUMBS_DIR, VIDEOS_DIR, DATA_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* --- Утилиты БД --- */

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

function readAuth() {
  if (!fs.existsSync(AUTH_FILE)) {
    const initial = { login: "admin", passwordHash: bcrypt.hashSync("12345", 10) };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
}

function writeAuth(data) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), "utf8");
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || `project_${Date.now()}`;
}

/* --- Сессии и CSRF --- */

function createSession(login) {
  const token = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { login, csrfToken, expires: Date.now() + SESSION_TTL_MS });
  return { token, csrfToken };
}

function getSession(token) {
  if (!token || !sessions.has(token)) return null;
  const s = sessions.get(token);
  if (Date.now() > s.expires) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((p) => {
    const [k, ...v] = p.trim().split("=");
    cookies[k] = decodeURIComponent(v.join("="));
  });
  return cookies;
}

function requireAuth(req, res, next) {
  const token = req.headers["x-auth-token"] || req.cookies?.authToken;
  const session = getSession(token);
  if (!session) return res.status(401).json({ error: "Требуется авторизация" });
  req.session = session;
  req.authToken = token;
  next();
}

function requireCsrf(req, res, next) {
  const csrf = req.headers["x-csrf-token"];
  if (!csrf || csrf !== req.session.csrfToken) {
    return res.status(403).json({ error: "Неверный CSRF-токен" });
  }
  next();
}

/* --- Загрузка файлов --- */

// Multer для изображений (до 10 МБ → uploads/)
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.test(file.mimetype)) return cb(null, true);
    cb(new Error("Допустимы только изображения (jpg, png, gif, webp, avif)"));
  }
});

// Multer для видео (до 500 МБ → uploads/videos/)
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: VIDEO_MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mimeOk = VIDEO_MIMES.test(file.mimetype);
    const extOk = VIDEO_EXTS.test(file.originalname);
    if (mimeOk || extOk) return cb(null, true);
    cb(new Error("Допустимы только видеофайлы (mp4, webm, mov, avi, mkv)"));
  }
});

async function createThumbnail(filename) {
  const src = path.join(UPLOADS_DIR, filename);
  const thumbName = `thumb_${path.parse(filename).name}.jpg`;
  const dest = path.join(THUMBS_DIR, thumbName);
  await sharp(src)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(dest);
  return `/uploads/thumbs/${thumbName}`;
}

// Формат размера файла для медиатеки
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/* --- Middleware --- */

app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  next();
});

app.use(express.json({ limit: "2mb" }));

app.use("/uploads", express.static(UPLOADS_DIR));

// Админка (vanilla JS + Bootstrap)
app.use("/admin", express.static(ADMIN_DIR));

// Вторая версия сайта (новый дизайн, живые данные из /api/content)
app.use("/v2", express.static(V2_DIR));

// Третья версия сайта (стиль Crave, статичный макет)
app.use("/v3", express.static(V3_DIR));

// Четвёртая версия — editorial-макет v4 (статика, без API)
app.use("/v4", express.static(V4_DIR));

// Пятая версия — playbill-макет v5 (статика, без API)
app.use("/v5", express.static(V5_DIR));

// red_draft — тёмно-красный макет дизайнера (живые данные из /api/content)
app.use("/red_draft", express.static(RED_DRAFT_DIR));

// Vue-сборка (лендинг)
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

/* --- Публичное API (агрегат для фронтенда) --- */

app.get("/api/content", (_req, res) => {
  res.json(readDb());
});

/* --- Projects --- */

app.get("/api/projects", (_req, res) => {
  res.json(readDb().projects || []);
});

app.get("/api/projects/:id", (req, res) => {
  const project = readDb().projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Спектакль не найден" });
  res.json(project);
});

app.post("/api/projects", requireAuth, requireCsrf, (req, res) => {
  const db = readDb();
  const body = req.body || {};
  if (!body.title?.trim()) return res.status(400).json({ error: "Название обязательно" });
  if (!body.description?.trim()) return res.status(400).json({ error: "Описание обязательно" });

  const id = body.id?.trim() || slugify(body.title);
  if (db.projects.some((p) => p.id === id)) {
    return res.status(409).json({ error: "Спектакль с таким ID уже существует" });
  }

  const project = {
    id,
    title: body.title.trim(),
    date: body.date || "",
    tag: body.tag || "",
    description: body.description.trim(),
    poster: body.poster || "",
    gallery: Array.isArray(body.gallery) ? body.gallery : [],
    soloists: Array.isArray(body.soloists) ? body.soloists : [],
    ticketLink: body.ticketLink || "",
    duration: body.duration || "",
    priceFrom: body.priceFrom ?? "",
    priceTo: body.priceTo ?? ""
  };

  db.projects.push(project);
  writeDb(db);
  res.status(201).json(project);
});

app.put("/api/projects/:id", requireAuth, requireCsrf, (req, res) => {
  const db = readDb();
  const idx = db.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Спектакль не найден" });

  const body = req.body || {};
  if (body.title !== undefined && !String(body.title).trim()) {
    return res.status(400).json({ error: "Название не может быть пустым" });
  }
  if (body.description !== undefined && !String(body.description).trim()) {
    return res.status(400).json({ error: "Описание не может быть пустым" });
  }

  db.projects[idx] = { ...db.projects[idx], ...body, id: req.params.id };
  writeDb(db);
  res.json(db.projects[idx]);
});

app.delete("/api/projects/:id", requireAuth, requireCsrf, (req, res) => {
  const db = readDb();
  const before = db.projects.length;
  db.projects = db.projects.filter((p) => p.id !== req.params.id);
  if (db.projects.length === before) return res.status(404).json({ error: "Спектакль не найден" });
  writeDb(db);
  res.json({ ok: true });
});

/* --- About, Director, Concertmaster, Choir, Contacts, Hero --- */

function sectionRoutes(sectionKey) {
  app.get(`/api/${sectionKey}`, (_req, res) => {
    const db = readDb();
    const map = {
      about: db.about,
      director: db.artisticDirector,
      concertmaster: db.concertmaster,
      choir: db.choirInvite,
      contacts: db.contacts,
      hero: db.hero,
      location: db.location,
      gallery: db.gallery
    };
    res.json(map[sectionKey] ?? {});
  });

  app.put(`/api/${sectionKey}`, requireAuth, requireCsrf, (req, res) => {
    const db = readDb();
    const keyMap = {
      about: "about",
      director: "artisticDirector",
      concertmaster: "concertmaster",
      choir: "choirInvite",
      contacts: "contacts",
      hero: "hero",
      location: "location",
      gallery: "gallery"
    };
    const dbKey = keyMap[sectionKey];
    db[dbKey] = { ...db[dbKey], ...req.body };
    writeDb(db);
    res.json(db[dbKey]);
  });
}

["about", "director", "concertmaster", "choir", "contacts", "hero", "location", "gallery"].forEach(sectionRoutes);

/* --- Auth --- */

app.post("/api/login", (req, res) => {
  const { login, password } = req.body || {};
  const auth = readAuth();

  if (login !== auth.login || !bcrypt.compareSync(password || "", auth.passwordHash)) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }

  const { token, csrfToken } = createSession(login);
  res.json({ token, csrfToken, login });
});

app.post("/api/logout", requireAuth, (_req, res) => {
  sessions.delete(_req.authToken);
  res.json({ ok: true });
});

app.get("/api/auth/check", (req, res) => {
  const token = req.headers["x-auth-token"] || req.cookies?.authToken;
  const session = getSession(token);
  res.json({ authenticated: !!session, login: session?.login || null });
});

app.put("/api/auth/password", requireAuth, requireCsrf, (req, res) => {
  const { oldPassword, newPassword, confirm } = req.body || {};
  const auth = readAuth();

  if (!bcrypt.compareSync(oldPassword || "", auth.passwordHash)) {
    return res.status(400).json({ error: "Неверный старый пароль" });
  }
  if (!newPassword || newPassword.length < 5) {
    return res.status(400).json({ error: "Новый пароль — минимум 5 символов" });
  }
  if (newPassword !== confirm) {
    return res.status(400).json({ error: "Пароли не совпадают" });
  }

  auth.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeAuth(auth);
  res.json({ ok: true, message: "Пароль изменён" });
});

/* --- Upload --- */

// Загрузка изображения (до 10 МБ)
app.post("/api/upload", requireAuth, requireCsrf, (req, res) => {
  uploadImage.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });

    const url = `/uploads/${req.file.filename}`;
    let thumb = null;
    try { thumb = await createThumbnail(req.file.filename); }
    catch (e) { console.warn("Превью не создано:", e.message); }
    res.json({ url, thumb, filename: req.file.filename, size: fmtSize(req.file.size) });
  });
});

// Загрузка видео (до 500 МБ) — поток с прогресс-заголовком
app.post("/api/upload/video", requireAuth, requireCsrf, (req, res) => {
  uploadVideo.single("video")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });

    const url = `/uploads/videos/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: fmtSize(req.file.size) });
  });
});

/* --- Медиатека --- */

// GET /api/media — список всех загруженных файлов (фото + видео)
// Публичный список всех фото из папки uploads (для галереи на сайте).
// Берём только файлы верхнего уровня — папки thumbs/ и videos/ исключаются автоматически.
app.get("/api/gallery/photos", (_req, res) => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return res.json({ photos: [] });
    const photos = fs.readdirSync(UPLOADS_DIR)
      .filter((f) => {
        const st = fs.statSync(path.join(UPLOADS_DIR, f));
        return st.isFile() && /\.(jpe?g|png|gif|webp|avif)$/i.test(f);
      })
      .sort((a, b) =>
        fs.statSync(path.join(UPLOADS_DIR, b)).mtimeMs - fs.statSync(path.join(UPLOADS_DIR, a)).mtimeMs
      )
      .map((f) => `/uploads/${f}`);
    res.json({ photos });
  } catch (e) {
    res.json({ photos: [] });
  }
});

app.get("/api/media", requireAuth, (_req, res) => {
  function listDir(dir, urlPrefix, typeFilter) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => {
        // Пропустить папки и служебные файлы
        const stat = fs.statSync(path.join(dir, f));
        if (stat.isDirectory()) return false;
        if (f === ".gitkeep") return false;
        return typeFilter ? typeFilter.test(f) : true;
      })
      .map((f) => {
        const stat = fs.statSync(path.join(dir, f));
        const thumbPath = path.join(THUMBS_DIR, `thumb_${path.parse(f).name}.jpg`);
        return {
          filename: f,
          url: `${urlPrefix}/${f}`,
          thumb: fs.existsSync(thumbPath) ? `/uploads/thumbs/thumb_${path.parse(f).name}.jpg` : null,
          size: fmtSize(stat.size),
          bytes: stat.size,
          modified: stat.mtime.toISOString(),
          type: VIDEO_EXTS.test(f) ? "video" : "image"
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));
  }

  const images = listDir(UPLOADS_DIR, "/uploads", /\.(jpe?g|png|gif|webp|avif)$/i);
  const videos = listDir(VIDEOS_DIR, "/uploads/videos", VIDEO_EXTS);

  res.json({ images, videos, total: images.length + videos.length });
});

// DELETE /api/media/:type/:filename — удалить файл
app.delete("/api/media/:type/:filename", requireAuth, requireCsrf, (req, res) => {
  const { type, filename } = req.params;

  // Защита от path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Недопустимое имя файла" });
  }

  let filePath;
  if (type === "video") {
    filePath = path.join(VIDEOS_DIR, filename);
  } else if (type === "image") {
    filePath = path.join(UPLOADS_DIR, filename);
    // Удалить превью если есть
    const thumbPath = path.join(THUMBS_DIR, `thumb_${path.parse(filename).name}.jpg`);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } else {
    return res.status(400).json({ error: "Неверный тип файла" });
  }

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Файл не найден" });
  fs.unlinkSync(filePath);
  res.json({ ok: true });
});

/* --- Админка и SPA --- */

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.html"));
});

app.get("/v2", (_req, res) => {
  res.sendFile(path.join(V2_DIR, "index.html"));
});

app.get("/v3", (_req, res) => {
  res.sendFile(path.join(V3_DIR, "index.html"));
});

app.get("/v4", (_req, res) => {
  res.sendFile(path.join(V4_DIR, "index.html"));
});

app.get("/v5", (_req, res) => {
  res.sendFile(path.join(V5_DIR, "index.html"));
});

app.get("/red_draft", (_req, res) => {
  res.sendFile(path.join(RED_DRAFT_DIR, "index.html"));
});

app.get("/", (_req, res) => {
  const index = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(503).send("Соберите фронтенд: npm run build");
});

// Vue Router fallback (если понадобится) — все не-API пути → index.html
app.get(/^\/(?!api|uploads|admin|v2|v3|v4|v5|red_draft).*/, (req, res, next) => {
  if (req.path.includes(".")) return next();
  const index = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  next();
});

/* --- Запуск --- */

app.listen(PORT, () => {
  console.log(`\n🎭 Сайт:    http://localhost:${PORT}`);
  console.log(`⚙️  Админка: http://localhost:${PORT}/admin`);
  console.log(`🔑 Логин:   admin / 12345\n`);
});
