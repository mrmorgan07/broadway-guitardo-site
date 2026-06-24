# Театрально-хоровой коллектив

**Vue 3** (лендинг) + **Express** (API) + **админ-панель** (Bootstrap).

## Почему Vue, а не React

Для простого лендинга Vue проще: меньше кода, понятные `.vue`-файлы, быстрый старт. React имеет смысл при очень большой команде или экосистеме — здесь Vue оптимален.

## Структура

```
client/              ← Vue 3 + Vite (публичный сайт)
  src/components/    ← секции лендинга, карусель
  dist/              ← сборка для продакшена

backend/             ← Express API + db.json
frontend/admin/      ← админ-панель (/admin)

```

## Запуск

### Продакшен

```bash
npm install
cd client && npm install && cd ..
npm run build      # собрать Vue
npm start          # http://localhost:3000
```

### Разработка (два терминала)

```bash
# Терминал 1 — API
npm run dev:api

# Терминал 2 — Vue с hot-reload
npm run dev:client   # http://localhost:5173 (прокси на API)
```

| | URL |
|---|---|
| Сайт (prod) | http://localhost:3000 |
| Сайт (dev) | http://localhost:5173 |
| Админка | http://localhost:3000/admin |
| Логин | `admin` / `12345` |

## Vue-компоненты

| Компонент | Блок |
|-----------|------|
| `HeroSection` | Главный экран |
| `AboutSection` | О коллективе + карусель |
| `TeamSection` | Худрук и концертмейстер |
| `CalendarSection` | Афиша |
| `ProjectModal` | Детали спектакля + карусель |
| `Carousel` | Слайдер (autoplay 4с) |

Данные загружаются из `GET /api/content` — правки через админку без пересборки (достаточно F5).

## Деплой

1. `npm run build`
2. Загрузить проект на Node-хостинг
3. `npm start`

Админка и API без изменений.
