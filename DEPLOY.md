# Деплой на Render

## Быстрый старт (5 шагов)

### 1. Подготовьте git-репозиторий

Если репозитория ещё нет — создайте его на GitHub:

```bash
git init
git add .
git commit -m "initial commit"
# Создайте репо на github.com, затем:
git remote add origin https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПО.git
git push -u origin main
```

Если репо уже есть — просто закоммитьте последние изменения:

```bash
git add .
git commit -m "prepare for Render deployment"
git push
```

---

### 2. Зарегистрируйтесь на Render

https://render.com — вход через GitHub, Google или email.

---

### 3. Создайте Web Service

1. В дашборде нажмите **New → Web Service**
2. Подключите свой GitHub-репозиторий
3. Render автоматически обнаружит `render.yaml` и заполнит поля — просто нажмите **Deploy**

**Или вручную:**

| Поле | Значение |
|---|---|
| Environment | Node |
| Region | Frankfurt (EU Central) |
| Build Command | `npm run render-build` |
| Start Command | `npm start` |
| Plan | Free |

---

### 4. Задайте переменные окружения

В разделе **Environment** вашего сервиса на Render добавьте:

| Ключ | Значение |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Любая длинная случайная строка (или нажмите **Generate**) |

> **Пароль от админки** хранится в `backend/data/auth.json` (bcrypt-хэш).  
> По умолчанию: логин `admin`, пароль `12345`.  
> **Обязательно смените пароль** через `/admin` → раздел «Безопасность» после первого деплоя.

---

### 5. Готово 🎉

После деплоя (~2-3 минуты) сайт будет доступен по URL вида:  
`https://broadway-guitardo.onrender.com`

---

## Адреса на сайте

| URL | Что это |
|---|---|
| `/` | Основной Vue-сайт |
| `/v3` | Дизайн v3 (тёмный, Crave) |
| `/v4` | Дизайн v4 (editorial, Midnight Opera) |
| `/v5` | Дизайн v5 (светлый, Playbill) |
| `/admin` | Панель администратора |

---

## ⚠️ Важно: ограничения Render Free

### Ephemeral Disk (эфемерный диск)

На **бесплатном тарифе** Render файлы, загруженные через админку, **сбрасываются при каждом деплое** (пуше в git).

| Что сбрасывается | Что остаётся |
|---|---|
| Новые загруженные фото и видео | Всё что есть в git |
| Изменения в `db.json` (если не закоммичены) | Данные из `db.json` в git |
| Изменения пароля в `auth.json` | Хэш пароля из git |

### Как обойти

**Вариант 1 (рекомендуется): Render Disk** — $7/месяц  
В разделе **Disks** добавьте постоянный диск:
- Mount path: `/backend-data`
- Затем обновите пути в server.js на `/backend-data/db.json` и `/backend-data/uploads/`

**Вариант 2: Работать через git**  
После изменений в админке — скачайте `db.json` и закоммитьте:
```bash
# Скачайте db.json через Render Shell (вкладка Shell в дашборде)
# Сохраните локально, добавьте в git и запушьте
git add backend/data/db.json
git commit -m "update content"
git push
```

**Вариант 3: Cloudinary / S3 для медиа** — более сложная интеграция.

### Sleep mode (режим сна)

На бесплатном тарифе сервис засыпает после **15 минут** без запросов.  
Первый запрос после сна может занять **30–60 секунд**.  
Для продакшена рассмотрите тариф **Starter ($7/мес.)** — он не засыпает.

---

## Локальная разработка

```bash
# Установить зависимости
npm install
npm install --prefix client

# Собрать фронтенд
npm run build

# Запустить сервер
npm start
# → http://localhost:3000
```

---

## Структура проекта

```
├── backend/
│   ├── server.js          # Express-сервер
│   ├── data/
│   │   ├── db.json        # Весь контент сайта
│   │   └── auth.json      # Логин/пароль от админки (bcrypt)
│   └── uploads/           # Загруженные файлы
├── client/                # Vue 3 + Vite (основной сайт /)
├── v3/ v4/ v5/            # Альтернативные дизайн-версии
├── frontend/admin/        # Админ-панель (/admin)
├── render.yaml            # Конфиг Render Blueprint
└── package.json
```
