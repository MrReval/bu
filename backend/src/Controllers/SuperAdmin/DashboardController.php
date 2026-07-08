<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;

final class DashboardController
{
    public static function stats(Request $req): void
    {
        $pdo = Connection::get();
        $sites = (int) $pdo->query('SELECT COUNT(*) FROM sites')->fetchColumn();
        $active = (int) $pdo->query("SELECT COUNT(*) FROM sites WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())")->fetchColumn();
        $customers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
        $appointments = (int) $pdo->query('SELECT COUNT(*) FROM appointments')->fetchColumn();
        $packages = (int) $pdo->query('SELECT COUNT(*) FROM packages')->fetchColumn();
        $expiringSoon = (int) $pdo->query("SELECT COUNT(*) FROM sites WHERE expires_at IS NOT NULL AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)")->fetchColumn();

        $recent = $pdo->query(
            'SELECT s.id, s.name, s.domain, s.status, s.expires_at, s.created_at, p.name AS package_name
             FROM sites s LEFT JOIN packages p ON p.id = s.package_id
             ORDER BY s.created_at DESC LIMIT 8'
        )->fetchAll();

        Response::json([
            'sites' => $sites,
            'active_sites' => $active,
            'customers' => $customers,
            'appointments' => $appointments,
            'packages' => $packages,
            'expiring_soon' => $expiringSoon,
            'recent_sites' => $recent,
        ]);
    }
}
