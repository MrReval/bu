# syntax=docker/dockerfile:1.4
#
# ── Dokploy ──────────────────────────────────────────────────────────────
# 1. DNS: رکورد A → IP سرور (بدون پورت — DNS پورت ندارد)
# 2. Dokploy → Domains → Create Domain:
#      Host: test.xpaydar.ir
#      Path: /
#      Container Port: 80
#      HTTPS: ON
# 3. بخش Advanced → Ports را خالی بگذارید (تداخل ایجاد می‌کند)
# 4. آدرس: https://test.xpaydar.ir  (بدون :پورت)
#
# ساخت:  docker build -t salon-platform .

# ── Stage 1: بیلد فرانت‌اند (وب + پنل ادمین) ─────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/

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
COPY import/ ./import/

COPY --from=frontend-build /build/backend/public/web ./backend/public/web
COPY --from=frontend-build /build/backend/public/admin ./backend/public/admin
COPY --from=frontend-build /build/backend/public/assets ./backend/public/assets

ENV APP_URL=https://test.xpaydar.ir
ENV SALON_NAME="سالن زیبایی"
ENV ADMIN_EMAIL=admin@salon.local
ENV ADMIN_PASSWORD=admin123
ENV ADMIN_NAME="مدیر"
ENV FORCE_IMPORT=0

COPY <<'EOF' /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
    DocumentRoot /var/www/html

    # پشت Traefik/Dokploy
    SetEnvIf X-Forwarded-Proto "https" HTTPS=on
    SetEnvIf X-Forwarded-Host "^(.+)$" HTTP_HOST=$1

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
        # ارسال Authorization به PHP (رفع 401 در پروداکشن)
        RewriteCond %{HTTP:Authorization} ^(.+)$
        RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]
        # روت / خودش یک دایرکتوری است — باید صریح به router.php برود
        RewriteRule ^$ router.php [L]
        RewriteCond %{REQUEST_FILENAME} -f
        RewriteRule ^ - [L]
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

COPY <<'EOF' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e

IMPORT_DIR="/var/www/html/import"
STORAGE="/var/www/html/backend/storage"
ENV_FILE="/var/www/html/backend/.env"
LOCK_FILE="${STORAGE}/installed.lock"

mkdir -p "${STORAGE}/uploads"
chown -R www-data:www-data "${STORAGE}"

SERVER_NAME=$(echo "${APP_URL}" | sed -e 's|^[^/]*//||' -e 's|:.*||' -e 's|/.*||')
echo "ServerName ${SERVER_NAME}" > /etc/apache2/conf-available/docker-servername.conf
a2enconf docker-servername >/dev/null 2>&1 || true

# ایمپورت دیتابیس و فایل‌های آپلود از پوشه import (داخل ایمیج)
if [ -f "${IMPORT_DIR}/database.sqlite" ]; then
  if [ "${FORCE_IMPORT}" = "1" ] || [ ! -f "${STORAGE}/database.sqlite" ]; then
    if [ "${FORCE_IMPORT}" = "1" ] || [ ! -f "${STORAGE}/import-seed.lock" ]; then
        echo ">> ایمپورت دیتابیس و فایل‌ها از import/..."
        cp "${IMPORT_DIR}/database.sqlite" "${STORAGE}/database.sqlite"
        mkdir -p "${STORAGE}/uploads"
        if [ -d "${IMPORT_DIR}/uploads" ]; then
            cp -r "${IMPORT_DIR}/uploads/." "${STORAGE}/uploads/"
        fi
        if [ -f "${IMPORT_DIR}/installed.lock" ]; then
            cp "${IMPORT_DIR}/installed.lock" "${LOCK_FILE}"
        elif [ ! -f "${LOCK_FILE}" ]; then
            date -Iseconds > "${LOCK_FILE}"
        fi
        if [ -f "${IMPORT_DIR}/.env" ]; then
            cp "${IMPORT_DIR}/.env" "${ENV_FILE}"
        fi
        date -Iseconds > "${STORAGE}/import-seed.lock"
        chown -R www-data:www-data "${STORAGE}"
        echo ">> ایمپورت انجام شد."
    fi
  fi
fi

# نصب اولیه فقط وقتی هیچ دیتابیسی وجود ندارد
if [ ! -f "${LOCK_FILE}" ] && [ ! -f "${STORAGE}/database.sqlite" ]; then
    echo ">> نصب اولیه..."
    php /var/www/html/scripts/install-cli.php \
        "${SALON_NAME}" "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}" "${ADMIN_NAME}"
    chown -R www-data:www-data "${STORAGE}"
    echo ">> ورود: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
elif [ ! -f "${LOCK_FILE}" ]; then
    date -Iseconds > "${LOCK_FILE}"
    echo ">> دیتابیس موجود است، از نصب مجدد صرف‌نظر شد."
fi

if [ -f "${ENV_FILE}" ]; then
    sed -i "s|^APP_URL=.*|APP_URL=${APP_URL}|" "${ENV_FILE}"
    sed -i "s|^APP_ENV=.*|APP_ENV=production|" "${ENV_FILE}"
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${STORAGE}/database.sqlite|" "${ENV_FILE}"
fi

echo ">> آماده: ${APP_URL}/  |  پنل: ${APP_URL}/admin/"

exec apache2-foreground
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p backend/storage/uploads \
    && chown -R www-data:www-data backend/storage

VOLUME ["/var/www/html/backend/storage"]

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/api/v1/settings/public || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
