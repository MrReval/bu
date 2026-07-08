<?php

declare(strict_types=1);

use Salon\Config;
use Salon\Http\Request;
use Salon\Http\UploadHelper;
use Salon\Router;
use Salon\Tenant\TenantResolver;

require dirname(__DIR__) . '/bootstrap.php';

Config::load(dirname(__DIR__) . '/.env');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';

// بررسی سلامت (مستقل از دامنه/دیتابیس)
if ($path === '/healthz') {
    header('Content-Type: text/plain; charset=utf-8');
    echo 'ok';
    exit;
}

// آپلودها (مشترک بین همه سایت‌ها؛ مسیر شامل site_id است)
if (UploadHelper::serveIfUpload($path)) {
    exit;
}

// فایل‌های استاتیک (JS/CSS/تصاویر بیلد فرانت)
if (preg_match('#\.(js|css|ico|png|jpg|jpeg|svg|woff2?|map|webp)$#', $path)) {
    $file = __DIR__ . $path;
    if (is_file($file)) {
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $types = [
            'js' => 'application/javascript', 'css' => 'text/css', 'svg' => 'image/svg+xml',
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'ico' => 'image/x-icon', 'webp' => 'image/webp', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
        ];
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
        readfile($file);
        exit;
    }
}

// تشخیص سایت از روی دامنه
$host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '';
try {
    $mode = TenantResolver::resolve($host);
} catch (\PDOException $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px">';
    echo '<h1>پایگاه داده در دسترس نیست</h1><p>اتصال MySQL را بررسی کنید (متغیرهای DB_*).</p></body></html>';
    exit;
}

// ── دامنه سوپرادمین ─────────────────────────────────────────────────────
if ($mode === 'platform') {
    if (str_starts_with($path, '/api')) {
        $request = Request::fromGlobals();
        $router = new Router();
        (require dirname(__DIR__) . '/src/super_routes.php')($router);
        $router->dispatch($request);
        exit;
    }
    $spa = __DIR__ . '/superadmin/index.html';
    if (is_file($spa)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($spa);
        exit;
    }
    http_response_code(503);
    echo 'پنل سوپرادمین بیلد نشده است.';
    exit;
}

// ── سایت ناشناخته ───────────────────────────────────────────────────────
if ($mode !== 'site') {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px">';
    echo '<h1>سایتی برای این دامنه یافت نشد</h1><p>دامنه در پنل سوپرادمین ثبت نشده است.</p></body></html>';
    exit;
}

// ── سایت غیرفعال/منقضی ──────────────────────────────────────────────────
if (!TenantResolver::siteIsActive()) {
    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px">';
    echo '<h1>این سرویس موقتاً غیرفعال است</h1><p>برای تمدید اشتراک با پشتیبانی تماس بگیرید.</p></body></html>';
    exit;
}

// ── API سایت ────────────────────────────────────────────────────────────
if (str_starts_with($path, '/api')) {
    $request = Request::fromGlobals();
    $router = new Router();
    (require dirname(__DIR__) . '/src/routes.php')($router);
    $router->dispatch($request);
    exit;
}

// ── پنل مدیریت سایت ─────────────────────────────────────────────────────
if (str_starts_with($path, '/admin') && !str_contains($path, '/assets/')) {
    $adminIndex = __DIR__ . '/admin/index.html';
    if (is_file($adminIndex)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($adminIndex);
        exit;
    }
}

// ── سایت عمومی (SPA) ────────────────────────────────────────────────────
$webIndex = __DIR__ . '/web/index.html';
if (is_file($webIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($webIndex);
    exit;
}

http_response_code(503);
echo '<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px">';
echo '<h1>پلتفرم سالن زیبایی</h1><p>فرانت‌اند بیلد نشده است.</p></body></html>';
