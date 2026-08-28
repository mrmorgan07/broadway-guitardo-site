# Деплой на Timeweb (VPS + S3) — чеклист

Стек после переезда с Cloudflare: **nginx** отдаёт статику `dist` (корень + `/admin`)
и проксирует `/api/*` на **Express (pm2)**; **SQLite-файл** — данные; **Timeweb S3** —
медиа. Доступно из РФ без VPN. Ветка: `dev_rus`.

> Сайт одноязычный: корень `/` — русская версия «Бродвей GUITARDO» (бывший `/rus`
> мигрирован в корень, отдельного `/rus` больше нет).

Легенда: 🧑 — делаешь ты; 🤖 — уже в коде.

---

## 0. Перенос данных из Cloudflare (Turso) → сид-файлы

🧑 Один раз, там где Turso доступна (локально, при необходимости с VPN):
```bash
TURSO_DATABASE_URL="libsql://...turso.io" TURSO_AUTH_TOKEN="<токен>" \
node scripts/export-turso-to-seed.mjs
```
Скрипт запишет текущий контент и логин/пароль в `backend/data/db.json` и `auth.json`.
🧑 Проверить и **закоммитить** эти файлы — на VPS они засеются в `site.db` при
первом старте (+ миграция афиши создаст показы из спектаклей).
> Медиа ссылаются на Cloudflare R2 и после переезда станут «битыми» — перезалить
> в S3 через админку (URL обновятся). Составы/роли добавляются в новой админке.

---

## 1. S3-бакет (медиа)

🧑 Timeweb Cloud → **S3-хранилище** → создать бакет (напр. `broadway-media`), тип
доступа — **публичный** (чтобы фото/видео открывались по URL).

🧑 Создать **ключи доступа** S3 (Access Key / Secret Key) — в разделе хранилища.

🧑 Записать: `endpoint` (обычно `https://s3.twcstorage.ru`), `bucket`, `region`
(обычно `ru-1`), `access key`, `secret key`, публичный URL бакета
(`https://s3.twcstorage.ru/<bucket>`).

🧑 **CORS** бакета (для прямой загрузки видео из браузера): разрешить `PUT` с
origin вашего домена (`AllowedMethods: PUT, GET`, `AllowedOrigins: https://ваш-домен`,
`AllowedHeaders: *`, `ExposeHeaders: ETag`).

## 2. VPS

🧑 Timeweb Cloud → облачный сервер (Ubuntu 24.04, **2 ГБ RAM** — sharp ест память
при обработке фото; 1 vCPU достаточно; диск 20–30 ГБ). Взять IP + SSH.

🧑 Базовая настройка + Node 20 + nginx + pm2 + swap:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git certbot python3-certbot-nginx
sudo npm i -g pm2
# swap под пики sharp
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 3. Приложение

🧑 Склонировать ветку, поставить зависимости, собрать статику:
```bash
sudo mkdir -p /var/www/broadway && sudo chown $USER:$USER /var/www/broadway
git clone -b dev_rus <repo-url> /var/www/broadway && cd /var/www/broadway
npm ci
npm run pages:build          # → ./dist (корень + /admin + шрифты)
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

🧑 Запустить API под pm2 (обслуживает только `/api/*`):
```bash
pm2 start backend/server.js --name broadway-api --max-memory-restart 700M
pm2 save && pm2 startup   # выполнить выведенную команду — автозапуск после ребута
```
В логе `pm2 logs broadway-api` должно быть `🗄  Медиа: S3 (...)` — значит S3
подхватился (иначе будет `локальный диск`, проверь S3_*).

## 4. Домен + nginx (раздаёт dist, проксирует /api)

🧑 A-запись домена → IP сервера. Конфиг `/etc/nginx/sites-available/broadway`:
```nginx
server {
  server_name ваш-домен www.ваш-домен;
  root /var/www/broadway/dist;
  index index.html;
  client_max_body_size 25m;   # для загрузки фото; видео идёт мимо (presigned в S3)

  gzip on;
  gzip_types text/css application/javascript image/svg+xml application/json;

  # API → Express
  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Админка
  location = /admin { return 301 /admin/; }
  location /admin/ { try_files $uri $uri/ /admin/index.html; }

  # Кеш статических ассетов
  location ~* \.(css|js|woff2?|jpg|jpeg|png|webp|svg|mp4)$ {
    expires 30d; add_header Cache-Control "public";
  }

  # Корневой сайт
  location / { try_files $uri $uri/ /index.html; }
}
```
🧑 Активировать и проверить:
```bash
sudo ln -s /etc/nginx/sites-available/broadway /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
🧑 TLS бесплатно:
```bash
sudo certbot --nginx -d ваш-домен -d www.ваш-домен
sudo certbot renew --dry-run
```

## 5. Проверка

🧑 `https://ваш-домен/` — сайт «Бродвей GUITARDO», hero-видео играет, данные из API.
🧑 `https://ваш-домен/admin/` — войти (логин/пароль из `backend/data/auth.json`;
по умолчанию `admin` / `12345`, **сменить**).
🧑 `curl https://ваш-домен/api/capabilities` → `{"storage":"s3","presignVideo":true,...}`.
🧑 Медиатека → загрузить фото → уйдёт в бакет `broadway-media/gallery/...` и
откроется по S3-URL. Видео — грузится напрямую в S3 (presigned PUT).
🧑 После `sudo reboot` сайт и API поднимаются сами (pm2 + nginx).

## 6. Обновления

- Фронт/бренд/контент шаблонов: `git pull` → `npm run pages:build` (иначе корень = 404).
- Бэкенд: `git pull` → `npm ci` (если менялись зависимости) → `pm2 restart broadway-api`.
- Сид `db.json` применяется только к **пустой** БД → для пересева остановить API,
  удалить `backend/data/site.db*`, запустить снова.

---

## Что уже сделано в коде (ветка dev_rus)
- 🤖 `backend/storage.js` — S3-клиент (aws4fetch) + индекс медиа в БД (`kv.media`).
- 🤖 Express: загрузка фото → S3 (sharp-оптимизация + превью), видео → presigned
  прямая загрузка в S3, медиатека/галерея/удаление — из индекса. Всё под флагом:
  нет `S3_*` → работает на диске, как раньше.
- 🤖 БД — локальный SQLite-файл (managed-БД не требуется).
- 🤖 `scripts/build-pages.mjs` — сборка `dist` (корень «Бродвей GUITARDO» + `/admin` + шрифты).
- 🤖 Составы/роли/афиша + карусели + раздел «Репертуар» — включены.

## Что уходит

Cloudflare Pages/Workers/R2, Turso. Папка `functions/` и `wrangler.toml` остаются в
репозитории, но на Timeweb не используются (nginx их игнорирует; можно удалить позже).
