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
        $suspended = (int) $pdo->query("SELECT COUNT(*) FROM sites WHERE status = 'suspended'")->fetchColumn();
        $expired = (int) $pdo->query("SELECT COUNT(*) FROM sites WHERE expires_at IS NOT NULL AND expires_at <= NOW()")->fetchColumn();
        $customers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
        $appointments = (int) $pdo->query('SELECT COUNT(*) FROM appointments')->fetchColumn();
        $packages = (int) $pdo->query('SELECT COUNT(*) FROM packages')->fetchColumn();
        $admins = (int) $pdo->query('SELECT COUNT(*) FROM platform_admins')->fetchColumn();
        $expiringSoon = (int) $pdo->query("SELECT COUNT(*) FROM sites WHERE expires_at IS NOT NULL AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)")->fetchColumn();

        $totalRevenue = (float) $pdo->query("SELECT COALESCE(SUM(total_price),0) FROM appointments WHERE status = 'completed'")->fetchColumn();
        $revenueMonth = (float) $pdo->query("SELECT COALESCE(SUM(total_price),0) FROM appointments WHERE status = 'completed' AND start_at >= DATE_FORMAT(NOW(), '%Y-%m-01')")->fetchColumn();
        $appointmentsToday = (int) $pdo->query('SELECT COUNT(*) FROM appointments WHERE DATE(start_at) = CURDATE()')->fetchColumn();
        $newCustomers30 = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();

        // فهرست کامل سایت‌ها با آمار مصرف/درآمد
        $rows = $pdo->query(
            "SELECT s.id, s.name, s.domain, s.status, s.expires_at, s.created_at,
                    p.name AS package_name,
                    (SELECT COUNT(*) FROM users u WHERE u.site_id = s.id AND u.role = 'customer') AS customers_count,
                    (SELECT COUNT(*) FROM appointments a WHERE a.site_id = s.id) AS appointments_count,
                    (SELECT COALESCE(SUM(total_price),0) FROM appointments a WHERE a.site_id = s.id AND a.status = 'completed') AS revenue,
                    (SELECT MAX(a.start_at) FROM appointments a WHERE a.site_id = s.id) AS last_activity
             FROM sites s LEFT JOIN packages p ON p.id = s.package_id
             ORDER BY revenue DESC, s.created_at DESC"
        )->fetchAll();

        $adminStmt = $pdo->prepare(
            "SELECT name, phone, email FROM users WHERE site_id = ? AND role = 'super_admin' ORDER BY id LIMIT 1"
        );
        foreach ($rows as &$r) {
            $adminStmt->execute([(int) $r['id']]);
            $a = $adminStmt->fetch() ?: [];
            $r['admin_name'] = $a['name'] ?? null;
            $r['admin_phone'] = $a['phone'] ?? null;
            $r['admin_email'] = $a['email'] ?? null;
            $r['revenue'] = (float) $r['revenue'];
            $r['customers_count'] = (int) $r['customers_count'];
            $r['appointments_count'] = (int) $r['appointments_count'];
            $r['is_expired'] = $r['expires_at'] !== null && strtotime((string) $r['expires_at']) <= time();
        }
        unset($r);

        Response::json([
            'totals' => [
                'sites' => $sites,
                'active_sites' => $active,
                'suspended_sites' => $suspended,
                'expired_sites' => $expired,
                'expiring_soon' => $expiringSoon,
                'customers' => $customers,
                'appointments' => $appointments,
                'packages' => $packages,
                'admins' => $admins,
                'total_revenue' => $totalRevenue,
                'revenue_month' => $revenueMonth,
                'appointments_today' => $appointmentsToday,
                'new_customers_30d' => $newCustomers30,
            ],
            'sites' => $rows,
        ]);
    }
}
