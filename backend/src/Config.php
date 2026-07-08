<?php

declare(strict_types=1);

namespace Salon;

final class Config
{
    private static array $data = [];

    public static function load(string $envPath): void
    {
        if (!is_file($envPath)) {
            return;
        }
        foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            self::$data[trim($key)] = trim($value, " \t\"'");
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        // متغیرهای محیطی سیستم (Docker/Dokploy) بر فایل .env اولویت دارند
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return $env;
        }
        return self::$data[$key] ?? $default;
    }

    public static function basePath(): string
    {
        return dirname(__DIR__);
    }

    public static function storagePath(): string
    {
        return self::basePath() . '/storage';
    }

    // ── اتصال MySQL ─────────────────────────────────────────────────────
    public static function dbHost(): string
    {
        return self::get('DB_HOST', '127.0.0.1');
    }

    public static function dbPort(): string
    {
        return self::get('DB_PORT', '3306');
    }

    public static function dbName(): string
    {
        return self::get('DB_NAME', self::get('DB_DATABASE', 'salon'));
    }

    public static function dbUser(): string
    {
        return self::get('DB_USER', self::get('DB_USERNAME', 'root'));
    }

    public static function dbPassword(): string
    {
        return self::get('DB_PASS', self::get('DB_PASSWORD', ''));
    }

    public static function dbDsn(): string
    {
        return sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            self::dbHost(),
            self::dbPort(),
            self::dbName()
        );
    }

    // ── دامنه پنل سوپرادمین ──────────────────────────────────────────────
    public static function superAdminDomain(): string
    {
        return strtolower(self::get('SUPERADMIN_DOMAIN', 'l.xpaydar.ir'));
    }

    public static function isInstalled(): bool
    {
        return is_file(self::storagePath() . '/installed.lock');
    }

    public static function appKey(): string
    {
        return self::get('APP_KEY', 'change-me-in-production');
    }

    public static function appUrl(): string
    {
        return rtrim(self::get('APP_URL', ''), '/');
    }
}
