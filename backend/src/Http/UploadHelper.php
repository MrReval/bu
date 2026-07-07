<?php

declare(strict_types=1);

namespace Salon\Http;

use Salon\Config;

final class UploadHelper
{
    public static function serveIfUpload(string $path): bool
    {
        if (!str_starts_with($path, '/uploads/')) {
            return false;
        }
        $rel = substr($path, strlen('/uploads/'));
        $file = Config::storagePath() . '/uploads/' . $rel;
        if (!is_file($file)) {
            http_response_code(404);
            echo 'Not found';
            return true;
        }
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $types = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
        ];
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
        header('Cache-Control: public, max-age=86400');
        readfile($file);
        return true;
    }
}
