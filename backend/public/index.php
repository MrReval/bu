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
// علاوه بر ریشه‌ی public، پوشه‌ی وب هم بررسی می‌شود تا اسِت‌های عمومی وب
// (مثل /defaults/hero.jpg و /favicon.ico) درست سرو شوند.
if (preg_match('#\.(js|css|ico|png|jpg|jpeg|svg|woff2?|map|webp)$#', $path) && !str_contains($path, '..')) {
    $types = [
        'js' => 'application/javascript', 'css' => 'text/css', 'svg' => 'image/svg+xml',
        'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
        'ico' => 'image/x-icon', 'webp' => 'image/webp', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
        'map' => 'application/json', 'gif' => 'image/gif',
    ];
    foreach ([__DIR__ . $path, __DIR__ . '/web' . $path] as $file) {
        if (is_file($file)) {
            $ext = pathinfo($file, PATHINFO_EXTENSION);
            header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
            header('Cache-Control: public, max-age=86400');
            readfile($file);
            exit;
        }
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
        try {
            $router->dispatch($request);
        } catch (\Throwable $e) {
            Salon\Services\Logger::exception($e, 'super');
            if (!headers_sent()) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
            }
            echo json_encode(['error' => 'خطای داخلی سرور'], JSON_UNESCAPED_UNICODE);
        }
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
    http_response_code(502);
    header('Content-Type: text/html; charset=utf-8');
    echo <<<'HTML'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>۵۰۲ — وب‌سایت موردنظر یافت نشد</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
<style>
  :root { --bg1:#0f172a; --bg2:#1e1b4b; --accent:#818cf8; --accent2:#c084fc; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: 'Vazirmatn', system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #e2e8f0;
    background: radial-gradient(circle at 20% 20%, rgba(129,140,248,.25), transparent 45%),
                radial-gradient(circle at 85% 80%, rgba(192,132,252,.22), transparent 42%),
                linear-gradient(160deg, var(--bg1), var(--bg2));
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
    position: relative;
  }
  .blob {
    position: absolute; border-radius: 50%; filter: blur(60px); opacity: .5;
    animation: float 9s ease-in-out infinite;
  }
  .blob.a { width: 320px; height: 320px; background: #6366f1; top: -80px; left: -60px; }
  .blob.b { width: 360px; height: 360px; background: #a855f7; bottom: -100px; right: -80px; animation-delay: 2s; }
  @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-24px) } }
  .card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    text-align: center;
    padding: 44px 32px;
    border-radius: 28px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.12);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow: 0 30px 80px -20px rgba(0,0,0,.6);
    animation: rise .6s cubic-bezier(.2,.8,.2,1) both;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(24px) scale(.97) } to { opacity: 1; transform: none } }
  .code {
    font-size: clamp(84px, 22vw, 130px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: 2px;
    background: linear-gradient(120deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 8px 40px rgba(129,140,248,.35);
  }
  .icon {
    width: 68px; height: 68px; margin: 0 auto 18px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 20px;
    background: rgba(129,140,248,.15);
    border: 1px solid rgba(129,140,248,.3);
  }
  .icon svg { width: 34px; height: 34px; stroke: var(--accent); }
  h1 { font-size: 22px; font-weight: 800; margin-top: 12px; color: #f8fafc; }
  p { margin-top: 12px; color: #94a3b8; font-size: 14px; line-height: 1.9; }
  .divider { height: 1px; background: rgba(255,255,255,.1); margin: 24px 0; }
  .hint { font-size: 12.5px; color: #64748b; }
</style>
</head>
<body>
  <span class="blob a"></span>
  <span class="blob b"></span>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M4.9 4.9l14.2 14.2"></path>
      </svg>
    </div>
    <div class="code">502</div>
    <h1>وب‌سایت موردنظر یافت نشد</h1>
    <p>این دامنه هنوز به هیچ وب‌سایتی متصل نشده است.<br>لطفاً کمی بعد دوباره تلاش کنید.</p>
    <div class="divider"></div>
    <div class="hint">در صورت نیاز با پشتیبانی در تماس باشید.</div>
  </div>
</body>
</html>
HTML;
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

// ── PWA: manifest و service worker (در صورت فعال‌بودن فیچر) ─────────────
if ($path === '/manifest.webmanifest') {
    Salon\Controllers\PwaController::manifest();
    exit;
}
if ($path === '/sw.js') {
    Salon\Controllers\PwaController::serviceWorker();
    exit;
}

// ── API سایت ────────────────────────────────────────────────────────────
if (str_starts_with($path, '/api')) {
    $request = Request::fromGlobals();
    $router = new Router();
    (require dirname(__DIR__) . '/src/routes.php')($router);
    try {
        $router->dispatch($request);
    } catch (\Throwable $e) {
        $sid = null;
        try {
            $sid = Salon\Tenant\TenantContext::siteIdOrNull();
        } catch (\Throwable $ignored) {
        }
        Salon\Services\Logger::error($e->getMessage(), [
            'type' => get_class($e),
            'file' => $e->getFile() . ':' . $e->getLine(),
        ], $sid, 'site');
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(['error' => 'خطای داخلی سرور'], JSON_UNESCAPED_UNICODE);
    }
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
