# BRIEF

## Проєкт
Внутрішня компанійська wiki на VitePress у репозиторії `/root/company-wiki`.

## Поточна ціль
Закрити доступ до wiki для неавторизованих користувачів і підготувати рольову модель мінімум з двома рівнями:
- `admins`
- `users`

Рекомендований стек:
- `Caddy` як reverse proxy
- `Authelia` як auth gateway
- wiki наразі працює через `VitePress dev server` на `127.0.0.1:5173`

## Поточний стан
- Домен `wiki.secretshop.ua` уже резолвиться на сервер.
- `Caddy` встановлений і віддає `wiki.secretshop.ua`.
- wiki доступна по `https://wiki.secretshop.ua`.
- У `docs/.vitepress/config.ts` додано `allowedHosts: ['wiki.secretshop.ua']`, щоб dev-server не блокував Host header.
- На головну додано лого `docs/public/img/secretshop-logo.jpg`.
- `Authelia` почали налаштовувати через Docker, але повний auth-flow ще не завершений.

## Ключова ремарка
Поточна схема з `vitepress dev` придатна для швидкого запуску, але як фінальний production-режим бажано перейти на:
- `vitepress build`
- роздачу статичного `dist` через `Caddy`

## Найближчі кроки
1. Добити запуск `Authelia` на `127.0.0.1:9091`.
2. Перевірити `https://auth.secretshop.ua`.
3. Підключити auth до `wiki.secretshop.ua` через Caddy.
4. Пізніше перевести wiki з dev-mode на static hosting.
