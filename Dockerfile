# syntax=docker/dockerfile:1.4

# ── Stage 1: بیلد فرانت‌اند (وب + پنل ادمین) ─────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/

# خروجی Vite → backend/public/{web,admin}
# فایل‌های CSS/JS وب در /assets ارجاع داده می‌شوند؛ کپی به مسیر درست
RUN cd frontend && npm run build \
    && cp -r ../backend/public/web/assets ../backend/public/assets

# ── Stage 2: بک‌اند PHP + Apache ───────────────────────────────────────────
FROM php:8.2-apache-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        libsqlite3-dev \
        curl \
    && docker-php-ext-install pdo_sqlite \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY backend/ ./backend/
COPY installer/ ./installer/
COPY scripts/ ./scripts/
COPY router.php VERSION ./

COPY --from=frontend-build /build/backend/public/web ./backend/public/web
COPY --from=frontend-build /build/backend/public/admin ./backend/public/admin
COPY --from=frontend-build /build/backend/public/assets ./backend/public/assets

# پیکربندی Apache: استاتیک مستقیم، بقیه از router.php
COPY <<'EOF' /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/html

    Alias /assets /var/www/html/backend/public/assets
    Alias /admin/assets /var/www/html/backend/public/admin/assets

    <Directory /var/www/html/backend/public/assets>
        Require all granted
    </Directory>
    <Directory /var/www/html/backend/public/admin/assets>
        Require all granted
    </Directory>

    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} -f [OR]
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule ^ - [L]
        RewriteRule ^ router.php [L]
    </Directory>

    <Directory /var/www/html/backend/storage>
        Require all denied
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# نصب خودکار در اولین اجرا
COPY <<'EOF' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e

STORAGE="/var/www/html/backend/storage"
ENV_FILE="/var/www/html/backend/.env"
LOCK_FILE="${STORAGE}/installed.lock"

mkdir -p "${STORAGE}/uploads"
chown -R www-data:www-data "${STORAGE}"

APP_URL="${APP_URL:-http://localhost:8080}"
SALON_NAME="${SALON_NAME:-سالن زیبایی}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@salon.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
ADMIN_NAME="${ADMIN_NAME:-مدیر}"

if [ ! -f "${LOCK_FILE}" ]; then
    echo ">> نصب اولیه..."
    php /var/www/html/scripts/install-cli.php \
        "${SALON_NAME}" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}" "${ADMIN_NAME}"
    sed -i "s|^APP_URL=.*|APP_URL=${APP_URL}|" "${ENV_FILE}"
    sed -i "s|^APP_ENV=.*|APP_ENV=production|" "${ENV_FILE}"
    chown -R www-data:www-data "${STORAGE}"
    echo ">> آماده: ${APP_URL}/  |  پنل: ${APP_URL}/admin/"
    echo ">> ورود: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
fi

exec apache2-foreground
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p backend/storage/uploads \
    && chown -R www-data:www-data backend/storage

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
