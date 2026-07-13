/**
 * Выгружает content и auth из боевой Turso (Cloudflare) в сид-файлы
 * backend/data/db.json и backend/data/auth.json.
 *
 * На VPS свежая SQLite (backend/data/site.db) засеется из этих файлов при первом
 * `npm start` (+ отработает миграция афиши: покажы из спектаклей с датой).
 *
 * Запуск ТАМ, ГДЕ TURSO ДОСТУПНА (например, локально с VPN, а не на РФ-VPS):
 *   TURSO_DATABASE_URL="libsql://...turso.io" TURSO_AUTH_TOKEN="<токен>" \
 *   node scripts/export-turso-to-seed.mjs
 *
 * Затем: проверьте db.json/auth.json и закоммитьте — они уедут на VPS через git.
 * Медиа (posters/gallery/фото солистов) ссылаются на Cloudflare R2 и после переезда
 * станут «битыми» — их нужно перезалить в S3 через админку (URL обновятся).
 */

import { createClient } from "@libsql/client";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("❌ Задайте TURSO_DATABASE_URL (и TURSO_AUTH_TOKEN).");
  process.exit(1);
}

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "backend", "data");
const db = createClient({ url, authToken });

async function kvGet(key) {
  const r = await db.execute({ sql: "SELECT value FROM kv WHERE key = ?", args: [key] });
  return r.rows.length ? JSON.parse(r.rows[0].value) : null;
}

try {
  const content = await kvGet("content");
  const auth = await kvGet("auth");

  if (content) {
    writeFileSync(join(DATA, "db.json"), JSON.stringify(content, null, 2));
    console.log(
      `✓ content → backend/data/db.json ` +
      `(projects: ${(content.projects || []).length}, ` +
      `soloists: ${(content.soloists || []).length}, ` +
      `shows: ${(content.shows || []).length})`
    );
  } else {
    console.log("⚠  content не найден в Turso — db.json не тронут");
  }

  if (auth) {
    writeFileSync(join(DATA, "auth.json"), JSON.stringify(auth, null, 2));
    console.log("✓ auth → backend/data/auth.json (текущий логин/пароль сохранены)");
  } else {
    console.log("⚠  auth не найден в Turso — auth.json не тронут");
  }

  console.log(
    "\nГотово. Проверьте файлы и закоммитьте db.json/auth.json.\n" +
    "На VPS они засеются в site.db при первом старте; медиа перезалить в S3 через админку."
  );
} catch (e) {
  console.error("❌ Ошибка:", e.message);
  process.exit(1);
}
