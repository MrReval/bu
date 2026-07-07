<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Config;

final class UpdateService
{
    private static function updateDir(): string
    {
        return Config::storagePath() . '/update';
    }

    private static function statusPath(): string
    {
        return self::updateDir() . '/status.json';
    }

    private static function logPath(): string
    {
        return self::updateDir() . '/update.log';
    }

    /** @return array<string, mixed> */
    public static function status(): array
    {
        @mkdir(self::updateDir(), 0755, true);
        $status = null;
        if (is_file(self::statusPath())) {
            $raw = (string) @file_get_contents(self::statusPath());
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $status = $decoded;
            }
        }
        if (!is_array($status)) {
            $status = [
                'running' => false,
                'started_at' => null,
                'finished_at' => null,
                'exit_code' => null,
            ];
        }

        $tail = '';
        if (is_file(self::logPath())) {
            $log = (string) @file_get_contents(self::logPath());
            // keep last ~6000 chars
            $tail = mb_substr($log, max(0, mb_strlen($log) - 6000));
        }

        $status['log_tail'] = $tail;
        return $status;
    }

    /** @return array<string, mixed> */
    public static function start(): array
    {
        $st = self::status();
        if (!empty($st['running'])) {
            return $st;
        }

        @mkdir(self::updateDir(), 0755, true);

        $runner = Config::basePath() . '/scripts/update-runner.php';
        if (!is_file($runner)) {
            return [
                'running' => false,
                'error' => 'اسکریپت بروزرسانی یافت نشد',
            ];
        }

        // start detached runner and return immediately
        $cmd = 'php ' . escapeshellarg($runner);
        $log = self::logPath();

        if (PHP_OS_FAMILY === 'Windows') {
            // Use cmd start /B to detach
            $full = 'start "" /B cmd /c ' . escapeshellarg($cmd . ' >> ' . escapeshellarg($log) . ' 2>&1');
            @pclose(@popen($full, 'r'));
        } else {
            $full = $cmd . ' >> ' . escapeshellarg($log) . ' 2>&1 &';
            @pclose(@popen($full, 'r'));
        }

        // small optimistic status; runner will overwrite shortly
        return self::status();
    }
}

