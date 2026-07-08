<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;

/**
 * ثبت لاگ فنی در دیتابیس (خطاها، هشدارها و رویدادها) برای مانیتورینگ سوپرادمین.
 * تمام عملیات best-effort است و هرگز نباید جریان اصلی را متوقف کند.
 */
final class Logger
{
    public static function log(string $level, string $message, array $context = [], ?int $siteId = null, string $channel = 'app'): void
    {
        try {
            $pdo = Connection::get();
            $pdo->prepare(
                'INSERT INTO system_logs (level, channel, site_id, message, context, ip, path) VALUES (?,?,?,?,?,?,?)'
            )->execute([
                $level,
                $channel,
                $siteId,
                mb_substr($message, 0, 2000),
                $context ? json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR) : null,
                $_SERVER['REMOTE_ADDR'] ?? null,
                mb_substr((string) ($_SERVER['REQUEST_URI'] ?? ''), 0, 255),
            ]);
        } catch (\Throwable $e) {
            // لاگ نباید خطا ایجاد کند
        }
    }

    public static function error(string $message, array $context = [], ?int $siteId = null, string $channel = 'app'): void
    {
        self::log('error', $message, $context, $siteId, $channel);
    }

    public static function warning(string $message, array $context = [], ?int $siteId = null, string $channel = 'app'): void
    {
        self::log('warning', $message, $context, $siteId, $channel);
    }

    public static function info(string $message, array $context = [], ?int $siteId = null, string $channel = 'app'): void
    {
        self::log('info', $message, $context, $siteId, $channel);
    }

    /** ثبت یک استثنا با جزئیات فایل/خط */
    public static function exception(\Throwable $e, string $channel = 'app'): void
    {
        self::log('error', $e->getMessage(), [
            'type' => get_class($e),
            'file' => $e->getFile() . ':' . $e->getLine(),
        ], null, $channel);
    }
}
