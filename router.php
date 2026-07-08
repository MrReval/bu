<?php

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (str_starts_with($uri, '/uploads/')) {
    require __DIR__ . '/backend/public/index.php';
    return true;
}

if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/backend/public/index.php';
    return true;
}

$public = __DIR__ . '/backend/public';
$local = $public . $uri;

if ($uri !== '/' && is_file($local)) {
    return false;
}

require $public . '/index.php';
return true;
