<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Config;

final class UploadService
{
    private const MAX_BYTES = 5_242_880; // 5MB
    private const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public static function saveUploadedImage(array $file, string $folder): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new \InvalidArgumentException('خطا در آپلود فایل');
        }
        if (($file['size'] ?? 0) > self::MAX_BYTES) {
            throw new \InvalidArgumentException('حداکثر حجم فایل ۵ مگابایت است');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']) ?: '';
        if (!in_array($mime, self::ALLOWED, true)) {
            throw new \InvalidArgumentException('فقط تصویر (JPG, PNG, WebP, GIF) مجاز است');
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpg',
        };

        $dir = Config::storagePath() . '/uploads/' . trim($folder, '/');
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('امکان ساخت پوشه آپلود نیست');
        }

        $name = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $dest = $dir . '/' . $name;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new \RuntimeException('ذخیره فایل ناموفق بود');
        }

        return '/uploads/' . trim($folder, '/') . '/' . $name;
    }

    public static function deleteByPath(?string $publicPath): void
    {
        if (!$publicPath || str_starts_with($publicPath, 'http')) {
            return;
        }
        $rel = ltrim($publicPath, '/');
        if (!str_starts_with($rel, 'uploads/')) {
            return;
        }
        $full = Config::storagePath() . '/' . $rel;
        if (is_file($full)) {
            @unlink($full);
        }
    }

    public static function publicUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        return str_starts_with($path, '/') ? $path : '/' . $path;
    }
}
