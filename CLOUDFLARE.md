# Миграция на Cloudflare Pages

План адаптации приложения под Cloudflare Pages + Pages Functions, при сохранении
рабочей версии на Render. Ветка разработки: **`dev2`**.

## Зафиксированные решения

| Вопрос | Решение | Почему |
|---|---|---|
| База данных | **Turso** (libSQL по сети) | Общая для обоих бэкендов, код почти не меняется (`@libsql/client` → на CF `@libsql/client/web`) |
| Оптимизация фото | **Ресайз на клиенте** (canvas) | Бесплатно; `sharp` (нативный libvips) на Workers невозможен |
| Стратегия бэкенда | **Держим оба**: Express (Render) + Hono (Cloudflare) | Render не ломаем, CF пилим параллельно |
| Хранилище медиа | **R2** (общий бакет для обоих) | Диска на Workers нет; общий бакет = единый контент на обеих платформах |
| Сессии | Express — in-memory; CF — **JWT-cookie** (stateless) | Изоляты Workers не шарят память |

## Ключевой принцип: единый набор данных

Раз держим оба бэкенда, у них должны быть **общие хранилища**, иначе контент
разъедется (в БД лежат URL картинок — если Render пишет на локальный диск, а CF в
R2, то на одной из платформ картинки не откроются).

- **Turso** — общая БД (контент + auth + индекс медиа).
- **R2** — общий бакет для фото/видео. URL в БД — абсолютные (R2 public / кастомный домен).
- **Индекс медиа в Turso** (ключ `media`) вместо чтения файловой системы —
  оба бэкенда читают/пишут один список. Убирает зависимость от `fs.readdir`
  (которого на Workers нет) и различий в API листинга бакета.

## Что переносится и как

### Статика (без изменений логики)
`client/dist` (Vue), макеты `red_draft*`, `v2..v5`, `frontend/admin` — раздаёт
Pages нативно (CDN, бесплатно). Маршруты страниц из Express (`/admin`, `/v3`, `/`,
SPA-fallback) **не портируются** — их заменяет статик-раздача Pages + `_routes.json`.

### API → Pages Functions (Hono)
Порт `/api/*` (18 эндпоинтов). Разбивка:

**Публичные (без auth):**
- `GET /api/content`, `GET /api/projects`, `GET /api/projects/:id`
- `GET /api/{about|director|concertmaster|choir|contacts|hero|location|gallery}`
- `GET /api/gallery/photos`, `GET /api/auth/check`

**Защищённые (auth + csrf):**
- `POST/PUT/DELETE /api/projects[/:id]`
- `PUT /api/{section}`
- `POST /api/login`, `POST /api/logout`, `PUT /api/auth/password`
- `POST /api/upload`, `POST /api/upload/video`, `DELETE /api/media/:type/:filename`

### Замены рантайма

| Node/Express | Cloudflare (Workers) |
|---|---|
| `express` | `hono` |
| `@libsql/client` | `@libsql/client/web` |
| `multer` (diskStorage) | `request.formData()` → R2 |
| `sharp` (превью/оптимизация) | ресайз в браузере админки перед загрузкой |
| `fs` (диск, listing) | R2 binding + индекс медиа в Turso |
| сессии в памяти (`Map`) | JWT-cookie (HMAC через Web Crypto), CSRF внутри токена |
| `bcryptjs` | `bcryptjs` (pure-JS, работает и там) |
| видео на диск | прямой upload браузер → R2 (presigned URL, обход лимита тела Workers) |

## Целевая структура

```
├── backend/server.js        # Express (Render) — остаётся, + R2-адаптер
├── functions/
│   └── api/[[path]].ts       # Hono-приложение (Cloudflare), все /api/*
├── shared/                   # переиспользуемая логика (валидация, формы данных)
├── frontend/admin/           # + клиентский ресайз и загрузка в R2
├── client/                   # Vue (лендинг)
├── wrangler.toml             # конфиг Pages (bindings: R2; vars: Turso, JWT_SECRET)
├── _routes.json              # /api/* → Functions, остальное → статика
└── scripts/build-pages.mjs   # сборка выходной папки статики для Pages
```

## Ресурсы Cloudflare/Turso (создаёт владелец аккаунта)

1. **Turso БД** — `turso db create broadway` → `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
2. **R2 бакет** — в дашборде CF: R2 → Create bucket (напр. `broadway-media`).
   Публичный доступ или кастомный домен `media.<домен>` для отдачи файлов.
3. **R2 API-токен (S3)** — для Express: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`.
4. **JWT_SECRET** — длинная случайная строка (для подписи cookie на CF).

### Переменные окружения

| Переменная | Render (Express) | Cloudflare (Functions) |
|---|---|---|
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | ✅ | ✅ (vars/secrets) |
| `R2_*` (S3-доступ) | ✅ | — (использует нативный R2 binding) |
| `R2_PUBLIC_BASE` (базовый URL отдачи) | ✅ | ✅ |
| `JWT_SECRET` | — | ✅ |

## Фазы работ

- [x] **Ф0. План** — этот документ.
- [ ] **Ф1. Каркас** — `wrangler.toml`, `_routes.json`, `functions/`, зависимости.
- [ ] **Ф2. Индекс медиа в Turso** — общий список для обоих бэкендов.
- [ ] **Ф3. R2 в Express** — загрузки Render пишут в общий бакет (sharp остаётся).
- [ ] **Ф4. Hono API** — порт всех `/api/*` с JWT-auth и R2.
- [ ] **Ф5. Клиентский ресайз** — админка сжимает фото и грузит в R2 (оба бэкенда).
- [ ] **Ф6. Сборка статики** — выходная папка Pages (Vue + макеты + admin).
- [ ] **Ф7. Деплой** — `wrangler pages deploy`, секреты, проверка.

## Локальная разработка

- Express (как сейчас): `npm start` → http://localhost:3000
- Cloudflare Functions: `npx wrangler pages dev` (нужен доступ к Turso и R2 или их
  локальные эмуляции; R2 у wrangler есть `--local`).

## Нерешённые нюансы (держать в голове)

- **Кэш контента в памяти.** На Render один процесс — ок. На CF каждая функция
  свой изолят, поэтому кэш либо короткоживущий, либо читаем из Turso напрямую в
  критичных ручках (правки из админки видны сразу).
- **bcryptjs на Workers** — pure-JS, для редкого логина по CPU-лимиту проходит,
  но проверить на нагрузке.
- **Лимит тела запроса Workers** — большое видео только прямым upload в R2.
