// Собирает выходную папку ./dist для Cloudflare Pages.
// Переносим ТОЛЬКО каталог site (основной сайт в корне) + админку.
// API берётся из ./functions автоматически.
// Запуск: node scripts/build-pages.mjs (обычно через npm run pages:build)

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

function copyInto(srcRel, destRel) {
  const src = join(ROOT, srcRel);
  if (!existsSync(src)) {
    console.warn(`⚠  пропуск (нет папки): ${srcRel}`);
    return;
  }
  const dest = join(DIST, destRel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`✓ ${srcRel} → dist/${destRel === "." ? "" : destRel}`);
}

// Основной сайт — каталог site в корень
copyInto("site", ".");
// В корне ассеты лежат в корне, а исходный index.html ссылается на них по
// абсолютному пути /site/... — правим префикс на / (только в копии).
const rootIndex = join(DIST, "index.html");
if (existsSync(rootIndex)) {
  const html = readFileSync(rootIndex, "utf8").replaceAll("/site/", "/");
  writeFileSync(rootIndex, html);
  console.log("✓ dist/index.html: пути ассетов → корень");
}

// /rus мигрирован в корень: корень / — единственная русская версия
// («Бродвей GUITARDO»). Отдельную копию /rus больше не генерируем.

// Шрифты макета лежат в соседней red_draft/fonts, а style.css ссылается на них
// по абсолютному пути /red_draft/fonts/... — переносим, чтобы путь резолвился.
copyInto("red_draft/fonts", "red_draft/fonts");

// Админка для управления контентом
copyInto("frontend/admin", "admin");
// Pages для /admin/ ищет index.html — admin.html лежит под этим именем
const adminHtml = join(DIST, "admin", "admin.html");
if (existsSync(adminHtml)) {
  cpSync(adminHtml, join(DIST, "admin", "index.html"));
  console.log("✓ dist/admin/index.html (из admin.html)");
}

// _routes.json — Functions только на /api/*, всё прочее раздаётся как статика
writeFileSync(
  join(DIST, "_routes.json"),
  JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2)
);
console.log("✓ dist/_routes.json");

console.log("\nГотово. Функции берутся из ./functions автоматически.");
