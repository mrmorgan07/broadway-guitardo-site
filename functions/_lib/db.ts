// Слой данных для Cloudflare Functions.
// Turso по сети (@libsql/client/web). Та же таблица kv, что и у Express:
// ключи "content" (сайт), "auth" (логин/хэш), "media" (индекс загрузок).
// Кэша в памяти нет — изоляты Workers его не шарят; читаем из Turso напрямую.

import { createClient } from "@libsql/client/web";

export function db(env: any) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

export async function kvGet(env: any, key: string) {
  const r = await db(env).execute({
    sql: "SELECT value FROM kv WHERE key = ?",
    args: [key],
  });
  return r.rows.length ? JSON.parse(r.rows[0].value as string) : null;
}

export async function kvSet(env: any, key: string, obj: any) {
  await db(env).execute({
    sql: "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, JSON.stringify(obj)],
  });
}

export const readContent = async (env: any) => (await kvGet(env, "content")) ?? {};
export const writeContent = (env: any, data: any) => kvSet(env, "content", data);

export const readAuth = (env: any) => kvGet(env, "auth");
export const writeAuth = (env: any, data: any) => kvSet(env, "auth", data);

// --- Индекс медиа (общий с Express) ---
// Элемент: { filename, url, thumb, type: "image"|"video", bytes, size, modified }
export const readMedia = async (env: any): Promise<any[]> => {
  const v = await kvGet(env, "media");
  return Array.isArray(v) ? v : [];
};

export async function addMedia(env: any, item: any) {
  const list = await readMedia(env);
  list.unshift(item);
  await kvSet(env, "media", list);
}

export async function removeMedia(env: any, url: string) {
  const list = await readMedia(env);
  const next = list.filter((m) => m.url !== url);
  await kvSet(env, "media", next);
  return next.length !== list.length;
}
