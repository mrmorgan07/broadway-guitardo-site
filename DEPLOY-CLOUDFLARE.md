# Деплой на Cloudflare Pages — чеклист владельца

Пошаговая инструкция: что нужно сделать **тебе** (нужны твои аккаунты).
Технически всё уже готово и проверено локально — см. [CLOUDFLARE.md](CLOUDFLARE.md).

Легенда: 🧑 — делаешь ты; 🤖 — могу сделать я (Claude), скажи.

---

## 0. Аккаунты (один раз)

- 🧑 Аккаунт **Cloudflare** — https://dash.cloudflare.com (вход через email/Google).
- 🧑 Аккаунт **Turso** — CLI уже установлен (`~/.turso/turso`):
  ```bash
  ~/.turso/turso auth signup     # откроется браузер, вход через GitHub
  ```

---

## 1. Turso: боевая база

🧑 Создать базу и получить доступы:
```bash
~/.turso/turso db create broadway --location fra   # fra = Франкфурт (ближе к РФ/ЕС)
~/.turso/turso db show broadway --url              # → libsql://broadway-<логин>.turso.io
~/.turso/turso db tokens create broadway           # → длинный токен
```
Сохрани `URL` и `токен` — понадобятся дальше как `TURSO_DATABASE_URL` и `TURSO_AUTH_TOKEN`.

🧑 **Засеять базу** (создаёт таблицу `kv` и заливает контент+логин из `db.json`/`auth.json`).
Один раз запусти Express против боевой Turso и после сообщения о сидировании нажми Ctrl+C:
```bash
TURSO_DATABASE_URL="libsql://...turso.io" TURSO_AUTH_TOKEN="<токен>" npm start
# дождись в логе: "content: перенесён в БД" и "auth: инициализирован" → Ctrl+C
```

---

## 2. R2: хранилище фото/видео

🧑 В дашборде Cloudflare → **R2** → *Create bucket*:
- Имя бакета: **`broadway-media`** (ровно так — оно прописано в `wrangler.toml`).

🧑 **Публичный доступ** к бакету (чтобы картинки открывались):
- Бакет → *Settings* → *Public access* → включить **r2.dev subdomain**
  (получишь URL вида `https://pub-xxxx.r2.dev`), **или** привязать свой домен
  `media.<твойдомен>`.
- Этот адрес пойдёт в переменную `R2_PUBLIC_BASE`.

🧑 **CORS** (нужно для прямой загрузки видео из браузера). Бакет → *Settings* →
*CORS policy* → добавить:
```json
[{ "AllowedOrigins": ["https://<проект>.pages.dev"],
   "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"] }]
```
(origin потом поправишь на реальный адрес Pages из шага 4.)

🧑 **S3 API-токен R2** (для presign-загрузки видео). R2 → *Manage R2 API Tokens*
→ *Create API token* (права Object Read & Write). Запиши:
- `Account ID`, `Access Key ID`, `Secret Access Key`.

---

## 3. Код в боевой ветке

🤖 Влить `dev2 → main` (там дизайн-правки + весь Cloudflare-стек). Скажи — сделаю
PR или смёржу напрямую. Cloudflare будет собирать с `main`.

---

## 4. Cloudflare Pages: подключить репозиторий

🧑 Дашборд → **Workers & Pages** → *Create* → *Pages* → *Connect to Git*:
1. Репозиторий: `mrmorgan07/broadway-guitardo-site`.
2. **Production branch:** `main`.
3. Build settings:
   | Поле | Значение |
   |---|---|
   | Build command | `npm run pages:build` |
   | Build output directory | `dist` |
   | Root directory | (пусто = корень) |

   Functions подхватятся из `functions/` сами; `nodejs_compat`, R2-биндинг и
   `R2_PUBLIC_BASE` берутся из `wrangler.toml`.

---

## 5. Переменные и секреты в Pages

🧑 Проект в Pages → *Settings* → *Environment variables* → **Production**, добавить:

| Ключ | Значение | Откуда |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://...turso.io` | шаг 1 |
| `TURSO_AUTH_TOKEN` | `<токен>` | шаг 1 |
| `JWT_SECRET` | любая длинная случайная строка | придумать |
| `R2_PUBLIC_BASE` | `https://pub-xxxx.r2.dev` | шаг 2 (перекроет значение из wrangler.toml) |
| `R2_ACCOUNT_ID` | `<account id>` | шаг 2 |
| `R2_ACCESS_KEY_ID` | `<access key>` | шаг 2 |
| `R2_SECRET_ACCESS_KEY` | `<secret>` | шаг 2 (пометить как Secret) |
| `R2_BUCKET` | `broadway-media` | шаг 2 |

🧑 Проверить, что в *Settings* → *Functions* → *R2 bindings* есть **`MEDIA` →
broadway-media** (обычно берётся из `wrangler.toml`; если нет — добавить вручную).

---

## 6. Деплой

🧑 *Deployments* → *Retry deployment* (или просто пуш в `main` — сборка запустится
сама). Через ~1–2 мин получишь адрес `https://<проект>.pages.dev`.

🧑 Вернись в шаг 2 (CORS) и впиши реальный origin `https://<проект>.pages.dev`.

---

## 7. Проверка и перезалив фото

🧑 Открыть `https://<проект>.pages.dev/` — сайт с данными из Turso.
🧑 Открыть `https://<проект>.pages.dev/admin/` — войти (логин/пароль **боевые**,
из `auth.json`; по умолчанию `admin` / `12345`, если не менял).
🧑 В админке → **Медиатека** → заново загрузить фото (и видео) — они лягут в R2
и появятся на сайте. Прописать постеры/галерею в спектаклях заново, если ссылки
на медиа изменились.
🧑 Если пароль ещё дефолтный — сменить в админке (раздел «Безопасность»).

---

## Кратко: что нужно именно от тебя

1. Turso: `auth signup` → создать базу → **засеять** (Express один раз).
2. R2: создать бакет `broadway-media` → включить публичный доступ → CORS → S3-токен.
3. Разрешить мне влить `dev2 → main`.
4. Pages: подключить репо (branch `main`, build `npm run pages:build`, output `dist`).
5. Вписать переменные/секреты.
6. Задеплоить, поправить CORS-origin, зайти в админку и **перезалить фото**.

Готов пройти это вместе — на любом шаге подскажу команды и проверю результат.
