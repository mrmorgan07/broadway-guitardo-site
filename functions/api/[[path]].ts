// Cloudflare Pages Function: всё /api/* на Hono.
// Порт backend/server.js (Express) под Workers-рантайм.

import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { getCookie, setCookie } from "hono/cookie";

import {
  readContent, writeContent, readAuth, writeAuth,
  readMedia, addMedia, removeMedia,
} from "../_lib/db";
import {
  genName, publicUrl, keyFromUrl, r2Put, r2Delete, presignPut, fmtSize,
} from "../_lib/r2";
import {
  createToken, getSession, comparePassword, hashPassword, isDefaultPassword,
} from "../_lib/auth";

const app = new Hono<{ Bindings: any; Variables: any }>().basePath("/api");

const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;
const VIDEO_RE = /\.(mp4|webm|mov|avi|mkv)$/i;

function slugify(text: string) {
  return (
    String(text).toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || `project_${Date.now()}`
  );
}

// --- Middlewares ---
const requireAuth = async (c: any, next: any) => {
  const token = c.req.header("x-auth-token") || getCookie(c, "authToken");
  const session = await getSession(c.env, token);
  if (!session) return c.json({ error: "Требуется авторизация" }, 401);
  c.set("session", session);
  await next();
};

const requireCsrf = async (c: any, next: any) => {
  const csrf = c.req.header("x-csrf-token");
  if (!csrf || csrf !== c.get("session").csrf) {
    return c.json({ error: "Неверный CSRF-токен" }, 403);
  }
  await next();
};

/* ---------- Публичное API ---------- */

app.get("/content", async (c) => c.json(await readContent(c.env)));

app.get("/projects", async (c) => c.json((await readContent(c.env)).projects || []));

app.get("/projects/:id", async (c) => {
  const p = ((await readContent(c.env)).projects || []).find((x: any) => x.id === c.req.param("id"));
  return p ? c.json(p) : c.json({ error: "Спектакль не найден" }, 404);
});

/* ---------- Projects (защищённые) ---------- */

app.post("/projects", requireAuth, requireCsrf, async (c) => {
  const db = await readContent(c.env);
  const body = await c.req.json().catch(() => ({}));
  if (!body.title?.trim()) return c.json({ error: "Название обязательно" }, 400);
  if (!body.description?.trim()) return c.json({ error: "Описание обязательно" }, 400);

  db.projects = db.projects || [];
  const id = body.id?.trim() || slugify(body.title);
  if (db.projects.some((p: any) => p.id === id)) {
    return c.json({ error: "Спектакль с таким ID уже существует" }, 409);
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
    soldOut: !!body.soldOut,
  };
  db.projects.push(project);
  await writeContent(c.env, db);
  return c.json(project, 201);
});

app.put("/projects/:id", requireAuth, requireCsrf, async (c) => {
  const db = await readContent(c.env);
  const idx = (db.projects || []).findIndex((p: any) => p.id === c.req.param("id"));
  if (idx === -1) return c.json({ error: "Спектакль не найден" }, 404);

  const body = await c.req.json().catch(() => ({}));
  if (body.title !== undefined && !String(body.title).trim())
    return c.json({ error: "Название не может быть пустым" }, 400);
  if (body.description !== undefined && !String(body.description).trim())
    return c.json({ error: "Описание не может быть пустым" }, 400);

  db.projects[idx] = { ...db.projects[idx], ...body, id: c.req.param("id") };
  await writeContent(c.env, db);
  return c.json(db.projects[idx]);
});

app.delete("/projects/:id", requireAuth, requireCsrf, async (c) => {
  const db = await readContent(c.env);
  const before = (db.projects || []).length;
  db.projects = (db.projects || []).filter((p: any) => p.id !== c.req.param("id"));
  if (db.projects.length === before) return c.json({ error: "Спектакль не найден" }, 404);
  await writeContent(c.env, db);
  return c.json({ ok: true });
});

/* ---------- Секции ---------- */

const SECTION_KEY: Record<string, string> = {
  about: "about", director: "artisticDirector", concertmaster: "concertmaster",
  choir: "choirInvite", contacts: "contacts", hero: "hero",
  location: "location", gallery: "gallery",
};

app.get("/:section", async (c, next) => {
  const dbKey = SECTION_KEY[c.req.param("section")];
  if (!dbKey) return next(); // не секция — пусть матчатся другие маршруты
  return c.json((await readContent(c.env))[dbKey] ?? {});
});

app.put("/:section", requireAuth, requireCsrf, async (c, next) => {
  const dbKey = SECTION_KEY[c.req.param("section")];
  if (!dbKey) return next();
  const db = await readContent(c.env);
  db[dbKey] = { ...db[dbKey], ...(await c.req.json().catch(() => ({}))) };
  await writeContent(c.env, db);
  return c.json(db[dbKey]);
});

/* ---------- Auth ---------- */

app.post("/login", async (c) => {
  const { login, password } = await c.req.json().catch(() => ({}));
  const auth = await readAuth(c.env);
  if (!auth || login !== auth.login || !comparePassword(password, auth.passwordHash)) {
    return c.json({ error: "Неверный логин или пароль" }, 401);
  }
  const t = await createToken(c.env, login);
  setCookie(c, "authToken", t.token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
  return c.json({ ...t, mustChangePassword: isDefaultPassword(auth.passwordHash) });
});

app.post("/logout", requireAuth, (c) => {
  // JWT stateless — сервер токен не хранит; клиент его выбрасывает.
  setCookie(c, "authToken", "", { httpOnly: true, path: "/", maxAge: 0 });
  return c.json({ ok: true });
});

app.get("/auth/check", async (c) => {
  const token = c.req.header("x-auth-token") || getCookie(c, "authToken");
  const session = await getSession(c.env, token);
  const auth = session ? await readAuth(c.env) : null;
  return c.json({
    authenticated: !!session,
    login: session?.login || null,
    mustChangePassword: auth ? isDefaultPassword(auth.passwordHash) : false,
  });
});

app.put("/auth/password", requireAuth, requireCsrf, async (c) => {
  const { oldPassword, newPassword, confirm } = await c.req.json().catch(() => ({}));
  const auth = await readAuth(c.env);
  if (!comparePassword(oldPassword, auth.passwordHash))
    return c.json({ error: "Неверный старый пароль" }, 400);
  if (!newPassword || newPassword.length < 5)
    return c.json({ error: "Новый пароль — минимум 5 символов" }, 400);
  if (newPassword !== confirm) return c.json({ error: "Пароли не совпадают" }, 400);

  auth.passwordHash = hashPassword(newPassword);
  await writeAuth(c.env, auth);
  return c.json({ ok: true, message: "Пароль изменён" });
});

/* ---------- Upload ---------- */
// Фото: админка присылает уже сжатый оригинал (image) и превью (thumb) — ресайз на
// клиенте (sharp на Workers невозможен). Оба кладём в R2, пишем в индекс media.

app.post("/upload", requireAuth, requireCsrf, async (c) => {
  const form = await c.req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return c.json({ error: "Файл не получен" }, 400);
  if (!IMAGE_RE.test(file.name)) return c.json({ error: "Допустимы только изображения" }, 400);

  const name = genName(file.name, ".jpg");
  const url = await r2Put(c.env, name, await file.arrayBuffer(), file.type || "image/jpeg");

  let thumbUrl: string | null = null;
  const thumb = form.get("thumb");
  if (thumb instanceof File) {
    const base = name.replace(/\.[^.]+$/, "");
    const thumbKey = `thumb_${base}.jpg`;
    thumbUrl = await r2Put(c.env, thumbKey, await thumb.arrayBuffer(), "image/jpeg");
  }

  const item = {
    filename: name, url, thumb: thumbUrl, type: "image",
    bytes: file.size, size: fmtSize(file.size), modified: new Date().toISOString(),
  };
  await addMedia(c.env, item);
  return c.json({ url, thumb: thumbUrl, filename: name, size: item.size });
});

// Видео: два режима.
// 1) ?presign=1 + JSON {filename, contentType} → выдаём presigned PUT-URL для прямой
//    загрузки в R2 из браузера (обход лимита тела Worker). После загрузки клиент
//    зовёт POST /api/upload/video/complete.
// 2) multipart с файлом (небольшое видео) → кладём напрямую через binding.

app.post("/upload/video", requireAuth, requireCsrf, async (c) => {
  if (c.req.query("presign") === "1") {
    const { filename, contentType, size } = await c.req.json().catch(() => ({}));
    if (!filename || !VIDEO_RE.test(filename)) return c.json({ error: "Некорректное имя видео" }, 400);
    const key = genName(filename, ".mp4");
    const uploadUrl = await presignPut(c.env, key, contentType || "video/mp4");
    return c.json({ uploadUrl, key, url: publicUrl(c.env, key), size: fmtSize(size || 0) });
  }

  const form = await c.req.formData();
  const file = form.get("video");
  if (!(file instanceof File)) return c.json({ error: "Файл не получен" }, 400);
  if (!VIDEO_RE.test(file.name)) return c.json({ error: "Допустимы только видеофайлы" }, 400);

  const name = genName(file.name, ".mp4");
  const url = await r2Put(c.env, name, file.stream(), file.type || "video/mp4");
  await addMedia(c.env, {
    filename: name, url, thumb: null, type: "video",
    bytes: file.size, size: fmtSize(file.size), modified: new Date().toISOString(),
  });
  return c.json({ url, filename: name, size: fmtSize(file.size) });
});

// Регистрация видео в индексе после прямой (presigned) загрузки.
app.post("/upload/video/complete", requireAuth, requireCsrf, async (c) => {
  const { key, url, size } = await c.req.json().catch(() => ({}));
  if (!key || !url) return c.json({ error: "Нет данных о загрузке" }, 400);
  await addMedia(c.env, {
    filename: key, url, thumb: null, type: "video",
    bytes: size || 0, size: fmtSize(size || 0), modified: new Date().toISOString(),
  });
  return c.json({ ok: true, url });
});

/* ---------- Медиатека ---------- */

app.get("/gallery/photos", async (c) => {
  const photos = (await readMedia(c.env))
    .filter((m) => m.type === "image")
    .map((m) => m.url);
  return c.json({ photos });
});

app.get("/media", requireAuth, async (c) => {
  const list = await readMedia(c.env);
  const images = list.filter((m) => m.type === "image");
  const videos = list.filter((m) => m.type === "video");
  return c.json({ images, videos, total: images.length + videos.length });
});

app.delete("/media/:type/:filename", requireAuth, requireCsrf, async (c) => {
  const type = c.req.param("type");
  const filename = c.req.param("filename");
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\"))
    return c.json({ error: "Недопустимое имя файла" }, 400);

  const list = await readMedia(c.env);
  const item = list.find((m) => m.filename === filename && m.type === type);
  if (!item) return c.json({ error: "Файл не найден" }, 404);

  // Защита от удаления используемого файла (перекрыть можно ?force=1)
  if (c.req.query("force") !== "1") {
    const dbStr = JSON.stringify(await readContent(c.env));
    if (dbStr.includes(item.url) || dbStr.includes(filename)) {
      return c.json({ error: "Файл используется в контенте сайта", inUse: true }, 409);
    }
  }

  await r2Delete(c.env, keyFromUrl(c.env, item.url));
  if (item.thumb) await r2Delete(c.env, keyFromUrl(c.env, item.thumb));
  await removeMedia(c.env, item.url);
  return c.json({ ok: true });
});

export const onRequest = handle(app);
