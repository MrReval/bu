<?php

declare(strict_types=1);

use Salon\Config;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Http\UploadHelper;
use Salon\Router;

require dirname(__DIR__) . '/bootstrap.php';

Config::load(dirname(__DIR__) . '/.env');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';

if (UploadHelper::serveIfUpload($path)) {
    exit;
}

if (!Config::isInstalled() && !str_starts_with($path, '/install')) {
    header('Location: /install/?step=1');
    exit;
}

if (preg_match('#\.(js|css|ico|png|jpg|svg|woff2?)$#', $path)) {
    $file = __DIR__ . $path;
    if (is_file($file)) {
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $types = ['js' => 'application/javascript', 'css' => 'text/css', 'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'ico' => 'image/x-icon'];
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
        readfile($file);
        exit;
    }
}

if (str_starts_with($path, '/api')) {
    $request = Request::fromGlobals();
    $router = new Router();
    $register = require dirname(__DIR__) . '/src/routes.php';
    $register($router);
    $router->dispatch($request);
    exit;
}

if (str_starts_with($path, '/admin') && !str_contains($path, '/assets/')) {
    $adminIndex = __DIR__ . '/admin/index.html';
    if (is_file($adminIndex)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($adminIndex);
        exit;
    }
}

if (!str_starts_with($path, '/api') && !preg_match('#\.(js|css|ico|png|jpg|svg|woff2?)$#', $path)) {
    $webIndex = __DIR__ . '/web/index.html';
    if (is_file($webIndex) && ($path === '/' || !str_starts_with($path, '/admin'))) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($webIndex);
        exit;
    }
}

http_response_code(503);
echo '<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px">';
echo '<h1>پلتفرم سالن زیبایی</h1>';
if (!Config::isInstalled()) {
    echo '<p><a href="/install/">شروع نصب</a></p>';
} else {
    echo '<p>فرانت‌اند بیلد نشده. دستور: <code>cd frontend && npm install && npm run build</code></p>';
}
echo '</body></html>';
