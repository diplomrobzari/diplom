# Проверка SEO, производительности и безопасности

Дата: 2026-05-04

## Что оптимизировано

- Frontend отключает `X-Powered-By`, не публикует production source maps, сжимает ответы и кеширует статичные изображения из `/images` на 1 год.
- `next/image` настроен на AVIF/WebP и долгий кеш изображений backend-источника.
- SEO-метаданные приведены к нормальному русскому тексту: title template, description, keywords, OpenGraph, Twitter Card, canonical, JSON-LD `WebSite`.
- Добавлен `manifest.ts`, sitemap расширен публичной страницей рейтинга, robots закрывает приватные разделы `/admin`, `/profile`, `/notifications`, `/login`, `/register`.
- Laravel CORS переведен с wildcard methods на явные методы и поддерживает production frontend через `FRONTEND_URL` / `APP_FRONTEND_URL`.
- Добавлены индексы БД для частых запросов: объявления по статусу/дате/городу, участия по пользователю/статусу, отзывы по автору, пользователи по admin/ban.
- `Competition::refreshStatus()` больше не делает лишний `saveQuietly()` при каждом просмотре, если статус не изменился.

## SQL Injection

- В контроллерах используется Laravel validation и Eloquent/query builder с параметризацией, прямой сборки SQL из пользовательского ввода не найдено.
- Поиск по объявлениям использует `where(..., 'like', "%{$value}%")`; Laravel передает значение как bound parameter.
- Дополнительно включен глобальный middleware `DetectSqlInjection`, который отсекает очевидные SQLi-паттерны до контроллеров.
- Для production важно оставить `APP_DEBUG=false`, чтобы SQL/stack trace не раскрывались наружу.

## XSS

- React по умолчанию экранирует пользовательский контент в UI.
- Глобальный middleware `SanitizeInput` обрезает HTML-теги и опасные `javascript:` / `data:text/html` в строковых полях.
- `dangerouslySetInnerHTML` используется только для статического JSON-LD, сформированного из констант приложения, без пользовательского ввода.
- Заголовки `X-Content-Type-Options: nosniff` и CSP уменьшают риск исполнения неожиданного контента.

## Clickjacking

- На Laravel API установлен `X-Frame-Options: DENY`.
- На Next frontend установлен `X-Frame-Options: DENY`.
- CSP содержит `frame-ancestors 'none'`, что запрещает встраивание сайта во фреймы современными браузерами.

## Остаточные рекомендации перед VPS

- В `.env` на сервере обязательно выставить `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://api.example.ru`, `FRONTEND_URL=https://example.ru`.
- Ограничить SSH вход по ключам и закрыть root login.
- Включить HTTPS и HSTS после проверки сертификата.
- Настроить scheduler Laravel, иначе напоминания за 3 дня/1 день/3 часа не будут отправляться автоматически.
- Если трафик вырастет, перевести `QUEUE_CONNECTION` с `sync` на `database` или `redis` и запустить queue worker.

