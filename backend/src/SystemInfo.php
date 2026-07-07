<?php

declare(strict_types=1);

namespace Salon;

final class SystemInfo
{
    public static function version(): string
    {
        $candidates = [
            Config::basePath() . '/VERSION',
            dirname(__DIR__) . '/VERSION',
        ];
        foreach ($candidates as $p) {
            if (is_file($p)) {
                $v = trim((string) file_get_contents($p));
                if ($v !== '') {
                    return $v;
                }
            }
        }
        return 'dev';
    }

    /** @return array<string, mixed> */
    public static function info(): array
    {
        $installedLock = Config::storagePath() . '/installed.lock';
        $installedAt = null;
        if (is_file($installedLock)) {
            $installedAt = trim((string) @file_get_contents($installedLock)) ?: null;
        }

        return [
            'version' => self::version(),
            'php' => PHP_VERSION,
            'installed_at' => $installedAt,
            'server_time' => date('c'),
        ];
    }
}

