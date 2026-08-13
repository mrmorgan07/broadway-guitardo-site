// Собирает выходную папку ./dist для Cloudflare Pages.
// Переносим ТОЛЬКО макет red_draft3_1_1 (как основной сайт в корне) + админку.
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

// Основной сайт — макет red_draft3_1_1 в корень
copyInto("red_draft3_1_1", ".");
// В корне ассеты лежат в корне, а исходный index.html ссылается на них по
// абсолютному пути /red_draft3_1_1/... — правим префикс на / (только в копии).
const rootIndex = join(DIST, "index.html");
if (existsSync(rootIndex)) {
  const html = readFileSync(rootIndex, "utf8").replaceAll("/red_draft3_1_1/", "/");
  writeFileSync(rootIndex, html);
  console.log("✓ dist/index.html: пути ассетов → корень");
}

// Русская копия сайта под /rus: бренд «Бродвей Гитардо», пути ассетов → /rus/.
// Корень / остаётся английским («Broadway Guitardo»), это отдельная копия.
copyInto("red_draft3_1_1", "rus");
const rusIndex = join(DIST, "rus", "index.html");
if (existsSync(rusIndex)) {
  const html = readFileSync(rusIndex, "utf8")
    .replaceAll("/red_draft3_1_1/", "/rus/")
    // «Бродвей» — по-русски, «GUITARDO» — латиницей заглавными (бренд-вордмарк)
    .replaceAll("Broadway <b>GUITARDO</b>", "Бродвей <b>GUITARDO</b>")
    .replaceAll("Broadway GUITARDO", "Бродвей GUITARDO")
    // Переопределяем data-бренд (hero/футер/логотип из /api/content) для /rus:
    .replace('<script src="/rus/script.js',
      '<script>window.__BRAND__ = "Бродвей GUITARDO";</script>\n  <script src="/rus/script.js');
  writeFileSync(rusIndex, html);
  console.log("✓ dist/rus/index.html: бренд «Бродвей GUITARDO», пути → /rus/");
}

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
