// Собирает выходную папку ./dist для Cloudflare Pages.
// Переносим ТОЛЬКО макет red_draft3_1_1 (как основной сайт в корне) + админку.
// API берётся из ./functions автоматически.
// Запуск: node scripts/build-pages.mjs (обычно через npm run pages:build)

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

// Админка для управления контентом
copyInto("frontend/admin", "admin");

// _routes.json — Functions только на /api/*, всё прочее раздаётся как статика
writeFileSync(
  join(DIST, "_routes.json"),
  JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2)
);
console.log("✓ dist/_routes.json");

console.log("\nГотово. Функции берутся из ./functions автоматически.");
