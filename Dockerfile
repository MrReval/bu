# syntax=docker/dockerfile:1.4
#
# ── پلتفرم چند‌سالنی (SaaS) روی MySQL ──────────────────────────────────────
# دیتابیس MySQL خارجی است؛ اطلاعات اتصال با متغیرهای محیطی داده می‌شود.
#
# Dokploy → Environment (نمونه):
#   DB_HOST=...            DB_PORT=3306
#   DB_NAME=salon          DB_USER=...        DB_PASS=...
#   SUPERADMIN_DOMAIN=l.xpaydar.ir
#   SUPER_NAME=مدیر        SUPER_EMAIL=super@site.com   SUPER_PASSWORD=...
#   (اختیاری برای ساخت اولین سایت)
#   FIRST_SITE_NAME=سالن رز   FIRST_SITE_DOMAIN=example1.com
#   FIRST_ADMIN_EMAIL=admin@example1.com   FIRST_ADMIN_PASSWORD=...
#
# Dokploy → Domains: هم دامنه سوپرادمین (l.xpaydar.ir) و هم دامنه هر سایت را
#   به همین اپ (Container Port: 80) اضافه کنید.
#
# ── Stage 1: بیلد فرانت‌اند (وب + ادمین + سوپرادمین) ────────────────────────
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
        default-mysql-client \
        curl \
    && docker-php-ext-install pdo_mysql pdo_sqlite \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY router.php VERSION ./
COPY import/ ./import/

COPY --from=frontend-build /build/backend/public/web ./backend/public/web
COPY --from=frontend-build /build/backend/public/admin ./backend/public/admin
COPY --from=frontend-build /build/backend/public/superadmin ./backend/public/superadmin
COPY --from=frontend-build /build/backend/public/assets ./backend/public/assets

# اطلاعات اتصال و اکانت‌ها از طریق ENV در Dokploy تنظیم می‌شوند
ENV DB_HOST=45.89.239.69
ENV DB_PORT=3306
ENV DB_NAME=salon
ENV DB_USER=adly
ENV DB_PASS="adly44101221adly"
ENV SUPERADMIN_DOMAIN=l.xpaydar.ir
ENV SUPER_NAME="مدیر پلتفرم"
ENV SUPER_EMAIL=super@platform.local
ENV SUPER_PASSWORD=super1234
ENV FIRST_SITE_NAME=""
ENV FIRST_SITE_DOMAIN=""
ENV FIRST_ADMIN_EMAIL=""
ENV FIRST_ADMIN_PASSWORD=""

COPY <<'EOF' /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
    DocumentRoot /var/www/html

    # پشت Traefik/Dokploy
    SetEnvIf X-Forwarded-Proto "https" HTTPS=on

    Alias /assets /var/www/html/backend/public/assets
    Alias /admin/assets /var/www/html/backend/public/admin/assets
    Alias /superadmin/assets /var/www/html/backend/public/superadmin/assets

    <Directory /var/www/html/backend/public/assets>
        Require all granted
    </Directory>
    <Directory /var/www/html/backend/public/admin/assets>
        Require all granted
    </Directory>
    <Directory /var/www/html/backend/public/superadmin/assets>
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

STORAGE="/var/www/html/backend/storage"
ENV_FILE="/var/www/html/backend/.env"

mkdir -p "${STORAGE}/uploads"
chown -R www-data:www-data "${STORAGE}"

echo "ServerName ${SUPERADMIN_DOMAIN}" > /etc/apache2/conf-available/docker-servername.conf
a2enconf docker-servername >/dev/null 2>&1 || true

# ساخت .env (متغیرهای محیطی سیستم اولویت دارند؛ این فقط APP_KEY را پایدار می‌کند)
if [ ! -f "${ENV_FILE}" ]; then
    APP_KEY=$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')
    cat > "${ENV_FILE}" <<ENVEOF
APP_ENV=production
APP_KEY=${APP_KEY}
SUPERADMIN_DOMAIN=${SUPERADMIN_DOMAIN}
ENVEOF
fi

# انتظار برای در دسترس بودن MySQL
echo ">> بررسی اتصال به MySQL (${DB_HOST}:${DB_PORT})..."
i=0
until mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" --silent 2>/dev/null; do
    i=$((i+1))
    if [ "$i" -ge 30 ]; then
        echo "!! اتصال به MySQL برقرار نشد؛ ادامه با تلاش برنامه..."
        break
    fi
    echo "   منتظر MySQL... ($i)"
    sleep 2
done

# مهاجرت + ساخت مدیر پلتفرم + (اختیاری) اولین سایت — idempotent
echo ">> اجرای مهاجرت و seed..."
php /var/www/html/scripts/install-cli.php \
    "${SUPER_NAME}" "${SUPER_EMAIL}" "${SUPER_PASSWORD}" \
    "${FIRST_SITE_NAME}" "${FIRST_SITE_DOMAIN}" "${FIRST_ADMIN_EMAIL}" "${FIRST_ADMIN_PASSWORD}" \
    || echo "!! هشدار: اجرای install-cli با خطا مواجه شد (بررسی اتصال DB)."

chown -R www-data:www-data "${STORAGE}"

echo ">> سوپرادمین: https://${SUPERADMIN_DOMAIN}/"

exec apache2-foreground
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p backend/storage/uploads \
    && chown -R www-data:www-data backend/storage

VOLUME ["/var/www/html/backend/storage"]

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
