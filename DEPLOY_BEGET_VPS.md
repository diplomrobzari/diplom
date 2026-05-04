# Деплой на VPS Beget

Инструкция рассчитана на вариант `frontend.example.ru` или основной домен для Next.js и отдельный `api.example.ru` для Laravel API. Это самый спокойный вариант для CORS, Sanctum и кеширования.

По документации Beget можно стартовать с LEMP-образа: Ubuntu 24.04, Nginx, MySQL и PHP уже установлены. Для Next.js дополнительно нужен Node.js LTS и PM2. У Beget также есть Node.js-образ с PM2 и Nginx, но для этого проекта удобнее LEMP + установка Node, потому что backend Laravel использует PHP/MySQL.

Источники Beget:

- https://beget.com/ru/cloud/marketplace/lemp
- https://beget.com/ru/cloud/marketplace/nodejs

## 1. Подготовка сервера

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git unzip curl nginx mysql-server php-cli php-fpm php-mysql php-mbstring php-xml php-curl php-zip php-bcmath php-gd php-intl
```

Установить Composer:

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Установить Node.js 20/22 LTS и PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Загрузка проекта

```bash
sudo mkdir -p /var/www/nastarte
sudo chown -R $USER:www-data /var/www/nastarte
cd /var/www/nastarte
git clone <URL_РЕПОЗИТОРИЯ> .
```

Если загружаешь архивом/SFTP, структура должна остаться такой:

```text
/var/www/nastarte/backend
/var/www/nastarte/frontend
```

## 3. База данных

```bash
sudo mysql
```

```sql
CREATE DATABASE nastarte CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nastarte'@'localhost' IDENTIFIED BY 'СЛОЖНЫЙ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON nastarte.* TO 'nastarte'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Backend Laravel

```bash
cd /var/www/nastarte/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Минимальные production-настройки в `backend/.env`:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.ru
FRONTEND_URL=https://example.ru
APP_FRONTEND_URL=https://example.ru

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nastarte
DB_USERNAME=nastarte
DB_PASSWORD=СЛОЖНЫЙ_ПАРОЛЬ

SESSION_DOMAIN=.example.ru
SANCTUM_STATEFUL_DOMAINS=example.ru,www.example.ru,api.example.ru

MAIL_MAILER=smtp
MAIL_HOST=smtp.example.ru
MAIL_PORT=465
MAIL_USERNAME=no-reply@example.ru
MAIL_PASSWORD=ПАРОЛЬ_ПОЧТЫ
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=no-reply@example.ru
MAIL_FROM_NAME="НаСтарте"
```

Запуск миграций и сидеров:

```bash
php artisan migrate --seed
php artisan storage:link
php artisan optimize
sudo chown -R www-data:www-data storage bootstrap/cache
```

Сидеры создадут 20 объявлений: 8 завершенных, 8 новых опубликованных и 4 на модерации.

## 5. Frontend Next.js

```bash
cd /var/www/nastarte/frontend
cp .env.example .env.production
nano .env.production
```

Минимум для `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.example.ru/api
NEXT_PUBLIC_API_BASE=https://api.example.ru/api
NEXT_PUBLIC_SITE_URL=https://example.ru
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=ВАШ_КЛЮЧ
```

Сборка и запуск:

```bash
npm ci
npm run build
pm2 start npm --name nastarte-frontend -- start -- -p 3000
pm2 save
pm2 startup
```

После `pm2 startup` терминал покажет команду, которую нужно выполнить один раз через `sudo`.

## 6. Nginx

Laravel API: `/etc/nginx/sites-available/nastarte-api`

```nginx
server {
    listen 80;
    server_name api.example.ru;

    root /var/www/nastarte/backend/public;
    index index.php;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Если сокет PHP называется иначе, проверь:

```bash
ls /run/php/
```

Frontend: `/etc/nginx/sites-available/nastarte-frontend`

```nginx
server {
    listen 80;
    server_name example.ru www.example.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Включить сайты:

```bash
sudo ln -s /etc/nginx/sites-available/nastarte-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/nastarte-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS

Если сертификат не выпущен автоматически через Beget, поставь Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.ru -d www.example.ru -d api.example.ru
```

После HTTPS поменяй `APP_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_*` на `https://...`, затем:

```bash
cd /var/www/nastarte/backend
php artisan optimize:clear
php artisan optimize

cd /var/www/nastarte/frontend
npm run build
pm2 restart nastarte-frontend
```

## 8. Scheduler Laravel

Напоминания о соревнованиях работают через scheduler. Добавь cron:

```bash
crontab -e
```

```cron
* * * * * cd /var/www/nastarte/backend && php artisan schedule:run >> /dev/null 2>&1
```

## 9. Проверка после деплоя

```bash
curl https://api.example.ru/api/health
pm2 status
sudo systemctl status nginx
cd /var/www/nastarte/backend && php artisan migrate:status
```

В браузере проверь:

- главную страницу и слайдер;
- список объявлений и пагинацию;
- регистрацию/вход;
- создание объявления и модерацию;
- запись участника;
- уведомления на сайте и письма;
- отзывы и ответы организатора.

