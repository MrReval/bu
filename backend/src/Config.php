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

    public static function dbPath(): string
    {
        $path = self::get('DB_DATABASE');
        if ($path && is_file($path)) {
            return $path;
        }
        return self::storagePath() . '/database.sqlite';
    }

    public static function isInstalled(): bool
    {
        return is_file(self::storagePath() . '/installed.lock');
    }

    public static function appKey(): string
    {
        return self::get('APP_KEY', 'change-me-in-production');
    }
}
