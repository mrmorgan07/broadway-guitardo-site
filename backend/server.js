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
const RED_DRAFT2_DIR = path.join(ROOT, "red_draft2");
const RED_DRAFT3_DIR = path.join(ROOT, "red_draft3");
const RED_DRAFT3_1_DIR = path.join(ROOT, "red_draft3_1");
const RED_DRAFT3_1_1_DIR = path.join(ROOT, "red_draft3_1_1");

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

/* --- Хранилище (libSQL / Turso) --- */
// Данные лежат в таблице kv двумя документами: "content" (сайт) и "auth".
// В dev — локальный файл backend/data/site.db; в проде — Turso (переживает редеплой
// на Render, где файловая система эфемерна). Контент кэшируется в памяти:
// чтения синхронные из кэша, записи — сквозные (persist → обновление кэша).

const { createClient } = require("@libsql/client");

const dbClient = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, "site.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN
});

let contentCache = null;
let authCache = null;

async function kvGet(key) {
  const r = await dbClient.execute({ sql: "SELECT value FROM kv WHERE key = ?", args: [key] });
  return r.rows.length ? JSON.parse(r.rows[0].value) : null;
}

async function kvSet(key, obj) {
  await dbClient.execute({
    sql: "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, JSON.stringify(obj)]
  });
}

// Инициализация: создаём таблицу и при первом запуске переносим данные из JSON-файлов.
async function initStore() {
  // Локальный файл (вариант A): WAL + таймауты ради надёжности и конкурентных чтений.
  // Для Turso (remote) PRAGMA не нужны.
  if (!process.env.TURSO_DATABASE_URL) {
    await dbClient.execute("PRAGMA journal_mode = WAL");
    await dbClient.execute("PRAGMA synchronous = NORMAL");
    await dbClient.execute("PRAGMA busy_timeout = 5000");
  }

  await dbClient.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

  contentCache = await kvGet("content");
  if (contentCache == null) {
    contentCache = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, "utf8")) : {};
    await kvSet("content", contentCache);
    console.log("🗄  content: перенесён в БД из db.json");
  }

  authCache = await kvGet("auth");
  if (authCache == null) {
    authCache = fs.existsSync(AUTH_FILE)
      ? JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"))
      : { login: "admin", passwordHash: bcrypt.hashSync("12345", 10) };
    await kvSet("auth", authCache);
    console.log("🗄  auth: инициализирован в БД");
  }
}

// Чтения — синхронно из кэша (возвращаем копию, чтобы мутации в хендлерах
// не трогали кэш до успешной записи).
function readDb() {
  return structuredClone(contentCache);
}

async function writeDb(data) {
  await kvSet("content", data);
  contentCache = data;
}

function readAuth() {
  return structuredClone(authCache);
}

async function writeAuth(data) {
  await kvSet("auth", data);
  authCache = data;
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

// Multer для изображений (до 20 МБ → uploads/)
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
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
  // limitInputPixels: false — снимаем лимит на разрешение, чтобы превью
  // создавалось даже для сверхбольших фото от фотографа (десятки мегапикселей)
  await sharp(src, { limitInputPixels: false })
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(dest);
  return `/uploads/thumbs/${thumbName}`;
}

// Максимальная сторона веб-версии оригинала
const IMG_MAX_DIM = 2560;

// Оптимизация оригинала: даунскейл до IMG_MAX_DIM + перекодирование в web-качество.
// Перезаписывает файл на месте. Возвращает новый размер в байтах или null (если пропущено).
async function optimizeImage(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".gif") return null; // не трогаем — иначе сломаем анимацию
  const fp = path.join(UPLOADS_DIR, filename);
  let pipe = sharp(fp, { limitInputPixels: false })
    .rotate() // авто-поворот по EXIF (фото с телефона/камеры)
    .resize(IMG_MAX_DIM, IMG_MAX_DIM, { fit: "inside", withoutEnlargement: true });
  if (ext === ".png") pipe = pipe.png({ compressionLevel: 9 });
  else if (ext === ".webp") pipe = pipe.webp({ quality: 82 });
  else if (ext === ".avif") pipe = pipe.avif({ quality: 55 });
  else pipe = pipe.jpeg({ quality: 82, mozjpeg: true });
  const buf = await pipe.toBuffer(); // sharp читает файл целиком до записи — перезапись безопасна
  fs.writeFileSync(fp, buf);
  return buf.length;
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

// red_draft2 — доработка red_draft: занавес-загрузка, 404, плавные анимации (живые данные)
app.use("/red_draft2", express.static(RED_DRAFT2_DIR));

// red_draft3 — WOW-песочница: спотлайт+угли, countdown, мобильный UX (живые данные)
app.use("/red_draft3", express.static(RED_DRAFT3_DIR));

// red_draft3_1 — итерация по цветовой палитре (светлее красный, читаемость на мобиле)
app.use("/red_draft3_1", express.static(RED_DRAFT3_1_DIR));

// red_draft3_1_1 — итерация по моушн/экшн-эффектам (поверх палитры 3_1)
app.use("/red_draft3_1_1", express.static(RED_DRAFT3_1_1_DIR));

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

app.post("/api/projects", requireAuth, requireCsrf, async (req, res) => {
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
    priceTo: body.priceTo ?? "",
    freeAdmission: !!body.freeAdmission,
    soldOut: !!body.soldOut
  };

  db.projects.push(project);
  try { await writeDb(db); } catch { return res.status(500).json({ error: "Ошибка сохранения" }); }
  res.status(201).json(project);
});

app.put("/api/projects/:id", requireAuth, requireCsrf, async (req, res) => {
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
  try { await writeDb(db); } catch { return res.status(500).json({ error: "Ошибка сохранения" }); }
  res.json(db.projects[idx]);
});

app.delete("/api/projects/:id", requireAuth, requireCsrf, async (req, res) => {
  const db = readDb();
  const before = db.projects.length;
  db.projects = db.projects.filter((p) => p.id !== req.params.id);
  if (db.projects.length === before) return res.status(404).json({ error: "Спектакль не найден" });
  try { await writeDb(db); } catch { return res.status(500).json({ error: "Ошибка сохранения" }); }
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

  app.put(`/api/${sectionKey}`, requireAuth, requireCsrf, async (req, res) => {
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
    try { await writeDb(db); } catch { return res.status(500).json({ error: "Ошибка сохранения" }); }
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
  // Сигналим админке, что всё ещё используется пароль по умолчанию
  const mustChangePassword = bcrypt.compareSync("12345", auth.passwordHash);
  res.json({ token, csrfToken, login, mustChangePassword });
});

app.post("/api/logout", requireAuth, (_req, res) => {
  sessions.delete(_req.authToken);
  res.json({ ok: true });
});

app.get("/api/auth/check", (req, res) => {
  const token = req.headers["x-auth-token"] || req.cookies?.authToken;
  const session = getSession(token);
  const mustChangePassword = session ? bcrypt.compareSync("12345", readAuth().passwordHash) : false;
  res.json({ authenticated: !!session, login: session?.login || null, mustChangePassword });
});

app.put("/api/auth/password", requireAuth, requireCsrf, async (req, res) => {
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
  try { await writeAuth(auth); } catch { return res.status(500).json({ error: "Ошибка сохранения" }); }
  res.json({ ok: true, message: "Пароль изменён" });
});

/* --- Upload --- */

// Загрузка изображения (до 20 МБ)
app.post("/api/upload", requireAuth, requireCsrf, (req, res) => {
  uploadImage.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });

    const url = `/uploads/${req.file.filename}`;

    // Оптимизируем оригинал (даунскейл + перекодирование), чтобы сайт грузился быстро
    let size = req.file.size;
    try {
      const newSize = await optimizeImage(req.file.filename);
      if (newSize) size = newSize;
    } catch (e) { console.warn("Оптимизация не удалась:", e.message); }

    let thumb = null;
    try { thumb = await createThumbnail(req.file.filename); }
    catch (e) { console.warn("Превью не создано:", e.message); }
    res.json({ url, thumb, filename: req.file.filename, size: fmtSize(size) });
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

  // Защита от удаления используемого файла: ищем имя файла в контенте.
  // Перекрыть можно явным ?force=1 (пользователь подтвердил в админке).
  if (req.query.force !== "1") {
    const dbStr = JSON.stringify(readDb());
    if (dbStr.includes(filename)) {
      return res.status(409).json({
        error: "Файл используется в контенте сайта",
        inUse: true
      });
    }
  }

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

app.get("/red_draft2", (_req, res) => {
  res.sendFile(path.join(RED_DRAFT2_DIR, "index.html"));
});

app.get("/red_draft3", (_req, res) => {
  res.sendFile(path.join(RED_DRAFT3_DIR, "index.html"));
});

app.get("/red_draft3_1", (_req, res) => {
  res.sendFile(path.join(RED_DRAFT3_1_DIR, "index.html"));
});

app.get("/red_draft3_1_1", (_req, res) => {
  res.sendFile(path.join(RED_DRAFT3_1_1_DIR, "index.html"));
});

app.get("/", (_req, res) => {
  const index = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(503).send("Соберите фронтенд: npm run build");
});

// Vue Router fallback (если понадобится) — все не-API пути → index.html
app.get(/^\/(?!api|uploads|admin|v2|v3|v4|v5|red_draft|red_draft2|red_draft3).*/, (req, res, next) => {
  if (req.path.includes(".")) return next();
  const index = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  next();
});

// 404 — всё, что не поймали выше: театральная страница red_draft2
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Не найдено" });
  }
  res.status(404).sendFile(path.join(RED_DRAFT2_DIR, "404.html"));
});

/* --- Запуск --- */

initStore()
  .then(() => {
    app.listen(PORT, () => {
      const target = process.env.TURSO_DATABASE_URL ? "Turso" : "локальный файл (site.db)";
      console.log(`\n🎭 Сайт:    http://localhost:${PORT}`);
      console.log(`⚙️  Админка: http://localhost:${PORT}/admin`);
      console.log(`🗄  Данные:  ${target}`);
      console.log(`🔑 Логин:   admin / 12345\n`);
    });
  })
  .catch((err) => {
    console.error("❌ Не удалось инициализировать БД:", err.message);
    process.exit(1);
  });
