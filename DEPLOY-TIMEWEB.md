# Деплой на Timeweb (VPS + S3) — чеклист

Стек после переезда с Cloudflare: **VPS (Express + SQLite-файл)** раздаёт сайт и API,
**Timeweb S3** хранит медиа. Доступно из РФ без VPN. Ветка: `deploy-timeweb`.

Легенда: 🧑 — делаешь ты; 🤖 — уже в коде.

---

## 1. S3-бакет (медиа)

🧑 Timeweb Cloud → **S3-хранилище** → создать бакет (напр. `broadway-media`), тип
доступа — **публичный** (чтобы фото/видео открывались по URL).

🧑 Создать **ключи доступа** S3 (Access Key / Secret Key) — в разделе хранилища.

🧑 Записать: `endpoint` (обычно `https://s3.twcstorage.ru`), `bucket`, `region`
(обычно `ru-1`), `access key`, `secret key`, публичный URL бакета
(`https://s3.twcstorage.ru/<bucket>`).

🧑 **CORS** бакета (для прямой загрузки видео из браузера): разрешить `PUT` с
origin вашего домена (`AllowedMethods: PUT`, `AllowedOrigins: https://ваш-домен`,
`AllowedHeaders: *`).

## 2. VPS

🧑 Timeweb Cloud → облачный сервер (Ubuntu 22.04, минимум 1 vCPU / 1–2 ГБ). Взять IP + SSH.

🧑 На сервере поставить Node 20+ и pm2:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs nginx
sudo npm i -g pm2
```

## 3. Приложение

🧑 Склонировать ветку и поставить зависимости:
```bash
git clone -b deploy-timeweb <repo-url> broadway && cd broadway
npm ci
```

🧑 Создать `.env` (по образцу `.env.example`) и заполнить S3-переменные:
```
PORT=3000
NODE_ENV=production
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=broadway-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_BASE=https://s3.twcstorage.ru/broadway-media
```
БД: TURSO_* не задавать → используется локальный файл `backend/data/site.db`
(создастся сам, засеется из `backend/data/db.json` при первом старте, включая
миграцию афиши).

🧑 Запустить под pm2:
```bash
pm2 start backend/server.js --name broadway
pm2 save && pm2 startup   # автозапуск после ребута
```
В логе должно быть `🗄  Медиа: S3 (...)` — значит S3 подхватился (иначе будет
`локальный диск`, проверь S3_*).

## 4. Домен + HTTPS (nginx)

🧑 A-запись домена → IP сервера. Затем nginx-прокси на `:3000`:
```nginx
server {
  server_name ваш-домен;
  client_max_body_size 20m;   # для загрузки фото; видео идёт мимо (в S3)
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```
🧑 TLS бесплатно:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен
```

## 5. Проверка

🧑 Открыть `https://ваш-домен/` — сайт с данными.
🧑 `https://ваш-домен/admin/` — войти (логин/пароль из `backend/data/auth.json`;
по умолчанию `admin` / `12345`, **сменить**).
🧑 Медиатека → загрузить фото → должно уйти в бакет `broadway-media/gallery/...`
и открыться по S3-URL. Видео — грузится напрямую в S3 (presigned).

---

## Что уже сделано в коде (ветка deploy-timeweb)
- 🤖 `backend/storage.js` — S3-клиент (aws4fetch) + индекс медиа в БД (`kv.media`).
- 🤖 Express: загрузка фото → S3 (sharp-оптимизация + превью), видео → presigned
  прямая загрузка в S3, медиатека/галерея/удаление — из индекса. Всё под флагом:
  нет `S3_*` → работает на диске, как раньше.
- 🤖 БД — локальный SQLite-файл (managed-БД не требуется).
- 🤖 Составы/роли/афиша + карусели — включены (собрано из dev_new_feature + dev2).

## Что уходит
Cloudflare Pages/Workers/R2, Turso. Папка `functions/` и `wrangler.toml` остаются в
репозитории, но на Timeweb не используются (можно удалить позже).
