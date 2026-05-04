# Папки для кастомизации профиля

Сюда добавляются пользовательские ассеты для рамок и фонов профиля:

- Рамки аватара: `frontend/public/assets/profile/frames/`
- Фоны профиля (включая GIF): `frontend/public/assets/profile/backgrounds/`

## Требования к рамкам аватара

- Формат: `.png` с прозрачностью.
- Рекомендуемый размер: `512x512`.
- Внутренний круг (зона лица) должен быть по центру, чтобы рамка ровно легла на аватар.
- Пример текущих имен, которые уже подключены в коде:
  - `frame_bronze.png`
  - `frame_silver.png`
  - `frame_gold.png`

## Требования к фонам профиля

- Поддерживаются `.jpg`, `.png`, `.webp`, `.gif`.
- Рекомендуемый размер: от `1600x900` и выше.
- Пример текущих имен:
  - `bg_confetti.gif`
  - `bg_night_city.jpg`
  - `bg_arena.gif`

Если используете другие имена файлов, обновите пути в:

- `backend/app/Http/Controllers/ProfileController.php`
- `frontend/src/app/users/[id]/page.tsx`
