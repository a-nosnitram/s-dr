# Достижения Надежды

Личный пиксельный журнал достижений для Надежды Федотовой. Интерфейс публикуется на GitHub Pages, а записи постоянно хранятся в бесплатной базе Cloudflare D1. Доступ защищён личным паролем Worker.

## Локальный запуск

```bash
npm install
npm run dev
```

Для локального API:

```bash
npm run db:migrate:local
APP_PASSWORDS='["первый-пароль","второй-пароль"]' npm run worker:dev
```

## Публикация

После сборки готовый сайт находится в папке `docs`. Для публикации напрямую из ветки выберите **Settings → Pages → Deploy from a branch → `main` → `/docs`**.

Адрес API для production задан в `.env.production`. Перед отправкой изменений выполните `npm run build` и добавьте обновлённую папку `docs` в коммит.

Изменения Worker публикуются отдельно:

```bash
npm run db:migrate:remote
npm run worker:deploy
```

Допустимые пароли хранятся только как Cloudflare secret в виде JSON-массива. Чтобы заменить их, выполните `npx wrangler secret put APP_PASSWORDS --config wrangler.jsonc`.
