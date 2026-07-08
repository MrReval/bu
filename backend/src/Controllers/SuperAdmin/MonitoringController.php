<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Config;
use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;

final class MonitoringController
{
    /** سلامت سیستم و منابع */
    public static function system(Request $req): void
    {
        $pdo = Connection::get();

        $mysqlVersion = '';
        try {
            $mysqlVersion = (string) $pdo->query('SELECT VERSION()')->fetchColumn();
        } catch (\Throwable $e) {
        }

        $storage = Config::storagePath();
        $diskTotal = @disk_total_space($storage) ?: 0;
        $diskFree = @disk_free_space($storage) ?: 0;

        $smsSent = (int) $pdo->query("SELECT COUNT(*) FROM sms_logs WHERE status = 'sent' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")->fetchColumn();
        $smsFailed = (int) $pdo->query("SELECT COUNT(*) FROM sms_logs WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")->fetchColumn();
        $errors24 = (int) $pdo->query("SELECT COUNT(*) FROM system_logs WHERE level = 'error' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")->fetchColumn();
        $logsTotal = (int) $pdo->query('SELECT COUNT(*) FROM system_logs')->fetchColumn();

        Response::json([
            'db_ok' => true,
            'php_version' => PHP_VERSION,
            'mysql_version' => $mysqlVersion,
            'server_time' => date('c'),
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'disk_total' => (float) $diskTotal,
            'disk_free' => (float) $diskFree,
            'disk_used' => (float) ($diskTotal - $diskFree),
            'sms_sent_24h' => $smsSent,
            'sms_failed_24h' => $smsFailed,
            'errors_24h' => $errors24,
            'logs_total' => $logsTotal,
        ]);
    }

    /** فهرست لاگ‌های فنی */
    public static function logs(Request $req): void
    {
        $pdo = Connection::get();
        $level = $req->query['level'] ?? '';
        $limit = (int) ($req->query['limit'] ?? 100);
        $limit = max(1, min(500, $limit));

        if (in_array($level, ['error', 'warning', 'info'], true)) {
            $stmt = $pdo->prepare(
                'SELECT l.*, s.name AS site_name FROM system_logs l
                 LEFT JOIN sites s ON s.id = l.site_id
                 WHERE l.level = ? ORDER BY l.id DESC LIMIT ' . $limit
            );
            $stmt->execute([$level]);
        } else {
            $stmt = $pdo->query(
                'SELECT l.*, s.name AS site_name FROM system_logs l
                 LEFT JOIN sites s ON s.id = l.site_id
                 ORDER BY l.id DESC LIMIT ' . $limit
            );
        }

        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['context'] = $r['context'] ? json_decode($r['context'], true) : null;
        }
        unset($r);

        Response::json(['logs' => $rows]);
    }

    /** پاک‌سازی لاگ‌ها (همه یا قدیمی‌تر از N روز) */
    public static function clearLogs(Request $req): void
    {
        $days = (int) ($req->body['days'] ?? 0);
        $pdo = Connection::get();
        if ($days > 0) {
            $pdo->prepare('DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)')->execute([$days]);
        } else {
            $pdo->exec('DELETE FROM system_logs');
        }
        Response::json(['ok' => true]);
    }
}
